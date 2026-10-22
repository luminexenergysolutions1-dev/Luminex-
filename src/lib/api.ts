import { isVideoUrl, isImageUrl } from "@/utils/media";
import {
  MediaValidationError,
  RESUMABLE_UPLOAD_THRESHOLD,
  formatFileSize,
  maxUploadBytes,
  resolveUpload,
  storageErrorMessage,
} from "@/utils/media";
import { supabaseAnonKey, supabaseProjectUrl } from "./supabase";
import { defaultSiteData } from "./defaults";
import { requireSupabase, supabase } from "./supabase";
import type {
  Faq,
  MediaItem,
  Project,
  QuoteRequest,
  QuoteStatus,
  Service,
  SiteData,
  Testimonial,
} from "./types";

/** site_settings rows: key -> jsonb value (homepage_content, about, contact_information, social_links, seo_settings) */
export type SettingKey =
  | "homepage_content"
  | "about"
  | "contact_information"
  | "social_links"
  | "seo_settings";

const MEDIA_BUCKET = "media";

/* ---------------- Public reads ---------------- */

export async function fetchSiteData(): Promise<SiteData> {
  if (!supabase) return defaultSiteData;
  const sb = supabase;

  const [settings, services, projects, testimonials, faqs] = await Promise.all([
    sb.from("site_settings").select("key,value"),
    sb.from("services").select("*").order("sort_order"),
    sb.from("projects").select("*").order("created_at", { ascending: false }),
    sb.from("testimonials").select("*").order("created_at", { ascending: false }),
    sb.from("faqs").select("*").order("sort_order"),
  ]);

  const map: Record<string, unknown> = {};
  (settings.data ?? []).forEach((r: { key: string; value: unknown }) => {
    map[r.key] = r.value;
  });

  const merged: SiteData = {
    homepage: { ...defaultSiteData.homepage, ...(map.homepage_content as object) },
    about: { ...defaultSiteData.about, ...(map.about as object) },
    contact: { ...defaultSiteData.contact, ...(map.contact_information as object) },
    social: { ...defaultSiteData.social, ...(map.social_links as object) },
    seo: { ...defaultSiteData.seo, ...(map.seo_settings as object) },
    services:
      services.data && services.data.length > 0
        ? (services.data as Service[])
        : defaultSiteData.services,
    projects: (projects.data as Project[]) ?? [],
    testimonials: (testimonials.data as Testimonial[]) ?? [],
    faqs:
      faqs.data && faqs.data.length > 0 ? (faqs.data as Faq[]) : defaultSiteData.faqs,
  };
  return merged;
}

/* ---------------- Settings ---------------- */

export async function saveSetting(key: SettingKey, value: unknown) {
  const sb = requireSupabase();
  const { error } = await sb
    .from("site_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/* ---------------- Generic table CRUD ---------------- */

type TableName = "services" | "projects" | "testimonials" | "faqs";

export async function upsertRow<T extends { id?: string }>(table: TableName, row: T) {
  const sb = requireSupabase();
  const payload = { ...row } as Record<string, unknown>;
  if (!payload.id) delete payload.id;
  const { data, error } = await sb.from(table).upsert(payload).select().single();
  if (error) throw error;
  return data as T;
}

export async function deleteRow(table: TableName, id: string) {
  const sb = requireSupabase();
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) throw error;
}

/** Seed the services table with defaults if it is empty (admin action). */
export async function seedDefaultServices() {
  const sb = requireSupabase();
  const rows = defaultSiteData.services.map(({ id: _id, ...rest }) => rest);
  const { error } = await sb.from("services").insert(rows);
  if (error) throw error;
}

export async function seedDefaultFaqs() {
  const sb = requireSupabase();
  const rows = defaultSiteData.faqs.map(({ id: _id, ...rest }) => rest);
  const { error } = await sb.from("faqs").insert(rows);
  if (error) throw error;
}

/* ---------------- Quotes ---------------- */

export interface QuoteInput {
  full_name: string;
  phone: string;
  email: string;
  location: string;
  service: string;
  property_type: string;
  contact_method: string;
  description: string;
  attachment_url?: string | null;
}

export async function submitQuote(input: QuoteInput) {
  const sb = requireSupabase();
  const { error } = await sb.from("quote_requests").insert({ ...input, status: "New" });
  if (error) throw error;
}

export async function uploadQuoteAttachment(file: File) {
  const sb = requireSupabase();
  const resolved = await resolveUpload(file);
  if (resolved.kind === "video") {
    throw new MediaValidationError("Quote attachments must be an image or a PDF document.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new MediaValidationError(`Attachment must be under 5MB (this file is ${formatFileSize(file.size)}).`);
  }
  const auth = await storageAuth(false);
  const name = safeFileName(file.name, resolved.extension);
  const path = `quotes/${name}`;
  await directUpload(file, path, resolved.contentType, auth);
  return `${auth.base}/storage/v1/object/public/media/${path}`;
}

export async function fetchQuotes(): Promise<QuoteRequest[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("quote_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as QuoteRequest[];
}

export async function updateQuoteStatus(id: string, status: QuoteStatus) {
  const sb = requireSupabase();
  const { error } = await sb.from("quote_requests").update({ status }).eq("id", id);
  if (error) throw error;
}

/* ---------------- Media ---------------- */

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}

const UPLOAD_CHUNK_SIZE = 4 * 1024 * 1024;
const UPLOAD_CHUNK_RETRIES = 3;

/** Builds a storage safe file name: no path separators, no traversal. */
function safeFileName(name: string, extension: string): string {
  const base = (name.replace(/\.[^.]+$/, "") || "file")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 60);
  return `${Date.now()}-${base || "file"}.${extension}`;
}

async function storageAuth(requireSession = true): Promise<{ base: string; apikey: string; token: string }> {
  const sb = requireSupabase();
  const base = supabaseProjectUrl;
  if (!base || !supabaseAnonKey) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    if (requireSession) {
      throw new Error("You must be signed in as an administrator to upload files.");
    }
    // Anonymous visitors may attach a document to a quote request.
    return { base, apikey: supabaseAnonKey, token: supabaseAnonKey };
  }
  return { base, apikey: supabaseAnonKey, token };
}

/** Single request upload with byte level progress reporting. */
async function directUpload(
  file: File,
  path: string,
  contentType: string,
  auth: { base: string; apikey: string; token: string },
  options?: UploadOptions
): Promise<void> {
  const url = `${auth.base}/storage/v1/object/media/${path}`;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("apikey", auth.apikey);
    xhr.setRequestHeader("Authorization", `Bearer ${auth.token}`);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.setRequestHeader("Cache-Control", "31536000");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (options?.onProgress && e.lengthComputable) {
        options.onProgress({ loaded: e.loaded, total: e.total, percent: Math.round((e.loaded / e.total) * 100) });
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let message = xhr.responseText || `Upload failed (HTTP ${xhr.status}).`;
      try {
        const parsed = JSON.parse(xhr.responseText);
        if (parsed?.message) message = parsed.message;
      } catch {
        /* keep the raw text */
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("Network error while uploading. Check your connection and try again."));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    const onAbort = () => xhr.abort();
    options?.signal?.addEventListener("abort", onAbort, { once: true });
    xhr.onloadend = () => options?.signal?.removeEventListener("abort", onAbort);
    xhr.send(file);
  });
}

/**
 * Resumable upload using the storage provider's TUS endpoint.
 * The file is sent in chunks so an interrupted connection only restarts the
 * current chunk instead of the whole file.
 */
async function resumableUpload(
  file: File,
  path: string,
  contentType: string,
  auth: { base: string; apikey: string; token: string },
  options?: UploadOptions
): Promise<void> {
  const meta = (name: string, value: string) => `${name} ${btoa(unescape(encodeURIComponent(value)))}`;
  const metadata = [
    meta("bucketName", "media"),
    meta("objectName", path),
    meta("contentType", contentType),
    meta("cacheControl", "31536000"),
  ].join(",");

  const create = await fetch(`${auth.base}/storage/v1/upload/resumable`, {
    method: "POST",
    headers: {
      apikey: auth.apikey,
      Authorization: `Bearer ${auth.token}`,
      "Tus-Resumable": "1.0.0",
      "Upload-Length": String(file.size),
      "Upload-Metadata": metadata,
      "x-upsert": "false",
    },
    signal: options?.signal,
  });
  if (!create.ok) {
    const text = await create.text();
    let message = text || `Upload could not be started (HTTP ${create.status}).`;
    try {
      const parsed = JSON.parse(text);
      if (parsed?.message) message = parsed.message;
    } catch {
      /* keep raw text */
    }
    throw new Error(message);
  }
  const location = create.headers.get("location");
  if (!location) throw new Error("The storage service did not return an upload session.");
  const uploadUrl = location.startsWith("http") ? location : `${auth.base}${location}`;

  let offset = 0;
  while (offset < file.size) {
    const end = Math.min(offset + UPLOAD_CHUNK_SIZE, file.size);
    const chunk = file.slice(offset, end);
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= UPLOAD_CHUNK_RETRIES; attempt++) {
      try {
        const res = await fetch(uploadUrl, {
          method: "PATCH",
          headers: {
            apikey: auth.apikey,
            Authorization: `Bearer ${auth.token}`,
            "Tus-Resumable": "1.0.0",
            "Content-Type": "application/offset+octet-stream",
            "Upload-Offset": String(offset),
          },
          body: chunk,
          signal: options?.signal,
        });
        if (res.status === 204 || res.status === 200) {
          lastError = null;
          break;
        }
        const text = await res.text();
        lastError = new Error(text || `Chunk upload failed (HTTP ${res.status}).`);
        if (res.status < 500 && res.status !== 429) break;
      } catch (e) {
        lastError = e;
      }
      if (attempt < UPLOAD_CHUNK_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
    if (lastError) {
      throw new Error(
        `Upload interrupted at ${Math.round((offset / file.size) * 100)}%: ${
          lastError instanceof Error ? lastError.message : String(lastError)
        }`
      );
    }
    offset = end;
    options?.onProgress?.({ loaded: offset, total: file.size, percent: Math.round((offset / file.size) * 100) });
  }

  // The last chunk already finalises the object; the explicit call is kept for
  // storage versions that need it. A 409 means "already stored", which is fine.
  try {
    const finish = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: auth.apikey,
        Authorization: `Bearer ${auth.token}`,
        "Tus-Resumable": "1.0.0",
        "Upload-Length": "0",
        "Upload-Metadata": metadata,
      },
      signal: options?.signal,
    });
    if (!finish.ok && finish.status !== 409) {
      const text = await finish.text();
      throw new Error(text || `Upload could not be completed (HTTP ${finish.status}).`);
    }
  } catch (e) {
    if (e instanceof Error && !/already exists/i.test(e.message)) throw e;
  }
}

export async function listMedia(): Promise<MediaItem[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.storage
    .from(MEDIA_BUCKET)
    .list("uploads", { sortBy: { column: "created_at", order: "desc" } });
  if (error) throw error;
  return (data ?? [])
    .filter((f) => f.name && !f.name.startsWith("."))
    .map((f) => {
      const mime = (f.metadata as { mimetype?: string } | null)?.mimetype ?? "";
      return {
        name: f.name,
        created_at: f.created_at ?? undefined,
        mime_type: mime || undefined,
        url: sb.storage.from(MEDIA_BUCKET).getPublicUrl(`uploads/${f.name}`).data.publicUrl,
      };
    });
}

export async function uploadMedia(file: File, options?: UploadOptions): Promise<MediaItem> {
  const auth = await storageAuth();
  // The browser supplied MIME type is not trusted: the file is identified by its
  // magic bytes and the canonical type is stored with the object.
  const resolved = await resolveUpload(file);
  const maxBytes = maxUploadBytes(resolved.kind);
  if (file.size > maxBytes) {
    throw new MediaValidationError(
      resolved.kind === "video"
        ? `Video must be under 50MB (this file is ${formatFileSize(file.size)}).`
        : `${resolved.kind === "pdf" ? "PDF" : "Image"} must be under 5MB (this file is ${formatFileSize(file.size)}).`
    );
  }
  const name = safeFileName(file.name, resolved.extension);
  const path = `uploads/${name}`;
  try {
    if (file.size >= RESUMABLE_UPLOAD_THRESHOLD) {
      await resumableUpload(file, path, resolved.contentType, auth, options);
    } else {
      await directUpload(file, path, resolved.contentType, auth, options);
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new Error(storageErrorMessage(e instanceof Error ? e.message : String(e), resolved.contentType));
  }
  return {
    name,
    mime_type: resolved.contentType,
    url: `${auth.base}/storage/v1/object/public/media/${path}`,
  };
}

export async function deleteMedia(name: string) {
  const sb = requireSupabase();
  const { error } = await sb.storage.from(MEDIA_BUCKET).remove([`uploads/${name}`]);
  if (error) throw error;
}

/* ---------------- Admin auth ---------------- */

export async function isCurrentUserAdmin(): Promise<boolean> {
  if (!supabase) return false;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  return Boolean(data);
}
