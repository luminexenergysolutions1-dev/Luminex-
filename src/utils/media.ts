/** True when a URL points at a video file (by MIME type or extension). */
export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  // Check by MIME type first (more reliable than extensions)
  const videoMimeTypes =
    "video/mp4 video/mov video/webm video/avi video/m4v video/3gp video/mk video/x-m4v video/mpeg video/mpg video/wmv video/flv video/x-flv".split(
      " "
    );
  if (videoMimeTypes.some((t) => lower.startsWith(t + "/") || lower === t)) return true;
  // Fall back to extension check
  return /\.(mp4|mov|webm|avi|m4v|3gp|mkv|mpg|mpeg|wmv|flv|mkv|threep)(\?.*)?$/i.test(lower);
}

/** True when a URL points at an image file (by MIME type or extension). */
export function isImageUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  const imageMimeTypes =
    "image/jpeg image/png image/gif image/svg+xml image/webp image/tiff image/bmp image/heic image/heif".split(
      " "
    );
  if (imageMimeTypes.some((t) => lower.startsWith(t + "/") || lower === t)) return true;
  // Fall back to extension check
  return /\.(jpg|jpeg|png|gif|svg|svgz|tif|tiff|bmp|webp|ico|heic|heif)(\?.*)?$/i.test(lower);
}

export const MEDIA_FIT = "h-full w-full object-cover";

/* ------------------------------------------------------------------ *
 * Upload validation
 * The allow-list below mirrors the `media` storage bucket configuration
 * in supabase/schema.sql. Keep both in sync: the bucket rejects any
 * MIME type that is not listed with "mime type ... is not supported".
 * ------------------------------------------------------------------ */

export type MediaUploadKind = "image" | "video" | "pdf";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
] as const;

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/mpeg",
  "video/x-msvideo",
] as const;

export const ALLOWED_PDF_TYPES = ["application/pdf"] as const;

export const ALLOWED_UPLOAD_TYPES: readonly string[] = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_PDF_TYPES,
];

/** `accept` attribute for the admin file inputs. */
export const UPLOAD_ACCEPT_ATTRIBUTE = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_PDF_TYPES,
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
  ".pdf",
  ".mp4",
  ".m4v",
  ".webm",
  ".mov",
  ".mpeg",
  ".mpg",
  ".avi",
].join(",");

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jpe: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  pdf: "application/pdf",
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  qt: "video/quicktime",
  mpeg: "video/mpeg",
  mpg: "video/mpeg",
  avi: "video/x-msvideo",
};

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/mpeg": "mpeg",
  "video/x-msvideo": "avi",
};

export function kindForMimeType(mime: string): MediaUploadKind | null {
  if ((ALLOWED_IMAGE_TYPES as readonly string[]).includes(mime)) return "image";
  if ((ALLOWED_VIDEO_TYPES as readonly string[]).includes(mime)) return "video";
  if ((ALLOWED_PDF_TYPES as readonly string[]).includes(mime)) return "pdf";
  return null;
}

const ascii = (bytes: Uint8Array, start: number, length: number): string => {
  let out = "";
  for (let i = start; i < start + length && i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
};

/**
 * Identifies a file by its magic bytes. The browser supplied MIME type is
 * not trusted: it is frequently wrong (e.g. "application/octet-stream" for
 * .mp4 on Windows) and is attacker controlled.
 */
export function sniffMimeType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // GIF87a / GIF89a
  if (ascii(bytes, 0, 4) === "GIF8") return "image/gif";
  // RIFF containers: WEBP (image) or AVI (video)
  if (ascii(bytes, 0, 4) === "RIFF") {
    const form = ascii(bytes, 8, 4);
    if (form === "WEBP") return "image/webp";
    if (form === "AVI ") return "video/x-msvideo";
    return null;
  }
  // ISO base media file format: MP4, MOV and AVIF all start with an "ftyp" box
  if (ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);
    if (brand === "qt  ") return "video/quicktime";
    if (brand === "avif" || brand === "avis") return "image/avif";
    if (
      ["isom", "iso2", "iso4", "iso5", "iso6", "iso8", "iso9", "mp41", "mp42", "avc1", "avc3", "dash", "mmp4", "M4V "].includes(
        brand
      )
    ) {
      return "video/mp4";
    }
    return null;
  }
  // Matroska / WebM: EBML header
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return "video/webm";
  }
  // MPEG video stream
  if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && (bytes[3] === 0xba || bytes[3] === 0xb3)) {
    return "video/mpeg";
  }
  // PDF document
  if (ascii(bytes, 0, 5) === "%PDF-") return "application/pdf";

  return null;
}

export interface ResolvedUpload {
  kind: MediaUploadKind;
  /** Canonical MIME type stored with the object. */
  contentType: string;
  /** Canonical file extension used for the stored object. */
  extension: string;
  /** True when the browser reported a MIME type that disagrees with the file content. */
  browserTypeMismatch: boolean;
}

export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaValidationError";
  }
}

const familyOf = (kind: MediaUploadKind | null): string | null =>
  kind === "image" ? "image" : kind === "video" ? "video" : kind === "pdf" ? "pdf" : null;

const describe = (kind: MediaUploadKind) =>
  kind === "video" ? "video" : kind === "image" ? "image" : "PDF document";

/**
 * Validates a selected file against the storage allow-list using the real
 * file content, then returns the canonical type to store it with.
 */
export async function resolveUpload(file: File): Promise<ResolvedUpload> {
  const name = file.name || "file";
  const extension = (name.split(".").pop() || "").toLowerCase();
  const fromExtension = EXTENSION_TO_MIME[extension] ?? null;
  const reported = (file.type || "").toLowerCase().split(";")[0].trim();

  const header = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const sniffed = sniffMimeType(header);

  if (!sniffed) {
    if (fromExtension) {
      throw new MediaValidationError(
        `"${name}" is not a valid ${describe(
          kindForMimeType(fromExtension) ?? "image"
        )}. The file content does not match its .${extension} extension.`
      );
    }
    throw new MediaValidationError(
      `"${name}" is not a supported file. Allowed types: ${ALLOWED_UPLOAD_TYPES.join(", ")}.`
    );
  }

  const sniffedKind = kindForMimeType(sniffed);
  if (!sniffedKind) {
    throw new MediaValidationError(
      `"${name}" has an unsupported file type (${sniffed}). Allowed types: ${ALLOWED_UPLOAD_TYPES.join(", ")}.`
    );
  }

  if (fromExtension) {
    const extensionKind = kindForMimeType(fromExtension);
    if (extensionKind && familyOf(extensionKind) !== familyOf(sniffedKind)) {
      throw new MediaValidationError(
        `"${name}" is a ${describe(sniffedKind)} but has a .${extension} extension. Rename the file to match its real content or pick a different file.`
      );
    }
  }

  const browserTypeMismatch = Boolean(reported) && kindForMimeType(reported) !== null && kindForMimeType(reported) !== sniffedKind;

  return {
    kind: sniffedKind,
    contentType: sniffed,
    extension: MIME_TO_EXTENSION[sniffed] ?? extension,
    browserTypeMismatch,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Maximum accepted size per kind. Must match the storage bucket file_size_limit (100MB). */
export function maxUploadBytes(kind: MediaUploadKind): number {
  return kind === "video" ? 100 * 1024 * 1024 : 5 * 1024 * 1024;
}

/** Human readable reason for a failed storage upload. */
export function storageErrorMessage(message: string, contentType?: string): string {
  const m = (message || "").toLowerCase();
  if (m.includes("mime type") && m.includes("not supported")) {
    return `The media bucket does not accept ${contentType ?? "this file type"}. Update the bucket allow-list with supabase/fix-media-bucket.sql, then retry.`;
  }
  if (m.includes("exceeds the maximum allowed size") || m.includes("payload too large") || m.includes("413")) {
    return "The file is larger than the storage limit for this bucket.";
  }
  if (m.includes("row level security") || m.includes("row-level security")) {
    return "Storage permission denied. This administrator account is not allowed to upload files.";
  }
  if (m.includes("jwt") || m.includes("not authenticated") || m.includes("401") || m.includes("token")) {
    return "Your session has expired. Sign in again and retry the upload.";
  }
  if (m.includes("network") || m.includes("failed to fetch") || m.includes("timeout")) {
    return "Network error while uploading. Check your connection and try again.";
  }
  if (m.includes("not found") || m.includes("404")) {
    return "The media bucket could not be found. Check the storage configuration.";
  }
  return message || "The upload failed. Please try again.";
}
