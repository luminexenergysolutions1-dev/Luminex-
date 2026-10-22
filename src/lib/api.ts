import { isVideoUrl, isImageUrl } from "@/utils/media";
import {
  MediaValidationError,
  formatFileSize,
  maxUploadBytes,
  resolveUpload,
  storageErrorMessage,
} from "@/utils/media";
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
  const path = `quotes/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await sb.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: resolved.contentType,
  });
  if (error) throw new Error(storageErrorMessage(error.message, resolved.contentType));
  return sb.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
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

export async function uploadMedia(file: File): Promise<MediaItem> {
  const sb = requireSupabase();
  // The browser supplied MIME type is not trusted: the file is identified by its
  // magic bytes and the canonical type is stored with the object.
  const resolved = await resolveUpload(file);
  const maxBytes = maxUploadBytes(resolved.kind);
  if (file.size > maxBytes) {
    throw new MediaValidationError(
      resolved.kind === "video"
        ? `Video must be under 100MB (this file is ${formatFileSize(file.size)}).`
        : `${resolved.kind === "pdf" ? "PDF" : "Image"} must be under 5MB (this file is ${formatFileSize(file.size)}).`
    );
  }
  const base = (file.name.replace(/\.[^.]+$/, "") || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
  const name = `${Date.now()}-${base}.${resolved.extension}`;
  const { error } = await sb.storage.from(MEDIA_BUCKET).upload(`uploads/${name}`, file, {
    cacheControl: "31536000",
    contentType: resolved.contentType,
  });
  if (error) throw new Error(storageErrorMessage(error.message, resolved.contentType));
  return {
    name,
    mime_type: resolved.contentType,
    url: sb.storage.from(MEDIA_BUCKET).getPublicUrl(`uploads/${name}`).data.publicUrl,
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
