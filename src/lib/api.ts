import { requireSupabase, supabase } from "./supabase";
import { defaultSiteData } from "./defaults";
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
  const path = `quotes/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await sb.storage.from(MEDIA_BUCKET).upload(path, file);
  if (error) throw error;
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

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/bmp",
  "image/tiff",
  "image/svg+xml",
];

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/x-msvideo",
  "video/x-m4v",
  "video/mpeg",
  "video/3gpp",
  "video/x-ms-wmv",
  "video/x-flv",
];

const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, "application/pdf", "video/ogg", "audio/ogg"];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB for images
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB for videos

function isVideoFile(file: File): boolean {
  return ALLOWED_VIDEO_TYPES.includes(file.type);
}

function isImageFile(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type);
}

function validateFile(file: File): { valid: boolean; error?: string; type: "image" | "video" | "pdf" | "unknown" } {
  // Check file signature (magic bytes) for security
  // For now, we trust the browser's file.type but also check against allowed list
  // In a production environment, you'd want to read the file header to verify
  
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
    if (file.size > 20 * 1024 * 1024) {
      return { valid: false, error: "Image files must be under 20MB", type: "image" };
    }
    return { valid: true, type: "image" };
  }
  
  if (ALLOWED_VIDEO_TYPES.includes(file.type)) {
    if (file.size > MAX_VIDEO_SIZE) {
      return { valid: false, error: "Video files must be under 100MB", type: "video" };
    }
    return { valid: true, type: "video" };
  }
  
  if (file.type === "application/pdf") {
    if (file.size > 20 * 1024 * 1024) {
      return { valid: false, error: "PDF files must be under 20MB", type: "pdf" };
    }
    return { valid: true, type: "pdf" };
  }
  
  return { valid: false, error: `Unsupported file type: ${file.type}. Supported: images (JPG, PNG, WebP, AVIF, GIF, BMP, TIFF, SVG), videos (MP4, WebM, MOV, MKV, AVI, M4V, MPEG, 3GP, WMV, FLV), PDF`, type: "unknown" };
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
      const isVideo = /\.(mp4|webm|mov|mkv|avi|m4v|mpeg|mpg|3gp|wmv|flv)(\?.*)?$/i.test(f.name);
      const mimeType = f.metadata?.mimetype ?? (isVideo ? "video/mp4" : "image/jpeg");
      return {
        name: f.name,
        created_at: f.created_at ?? undefined,
        url: sb.storage.from(MEDIA_BUCKET).getPublicUrl(`uploads/${f.name}`).data.publicUrl,
        mimeType: f.metadata?.mimetype ?? (isVideo ? "video/mp4" : "image/jpeg"),
        isVideo: true,
      };
    });
}

export async function uploadMedia(file: File): Promise<MediaItem> {
  const sb = requireSupabase();
  
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  const isVideo = file.type.startsWith("video/");
  const name = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const path = `uploads/${name}`;
  
  const { error } = await sb.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  
  if (error) {
    // Provide more helpful error messages
    if (error.message.includes("mime type")) {
      throw new Error(`File type not allowed: ${file.type}. Please convert to a supported format.`);
    }
    if (error.message.includes("size") || error.message.includes("size limit")) {
      throw new Error(`File too large. Maximum size: 100MB for videos, 20MB for images/PDFs.`);
    }
    throw error;
  }
  
  return {
    name,
    mimeType: file.type,
    isVideo: file.type.startsWith("video/"),
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
