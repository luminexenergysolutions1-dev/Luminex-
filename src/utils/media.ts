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
 *
 * The allow-list mirrors the `media` storage bucket configuration in
 * supabase/schema.sql: Supabase Storage rejects any MIME type that is not
 * listed with "mime type ... is not supported".
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
  "video/x-m4v",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "video/x-msvideo",
  "video/mpeg",
  "video/3gpp",
  "video/x-ms-wmv",
  "video/x-flv",
  "video/ogg",
  "video/mp2t",
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
  ".mov",
  ".webm",
  ".mkv",
  ".avi",
  ".mpeg",
  ".mpg",
  ".3gp",
  ".wmv",
  ".flv",
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
  m4v: "video/x-m4v",
  webm: "video/webm",
  mov: "video/quicktime",
  qt: "video/quicktime",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  mpeg: "video/mpeg",
  mpg: "video/mpeg",
  mpe: "video/mpeg",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp",
  wmv: "video/x-ms-wmv",
  flv: "video/x-flv",
};

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
  "video/x-m4v": "m4v",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-matroska": "mkv",
  "video/x-msvideo": "avi",
  "video/mpeg": "mpeg",
  "video/3gpp": "3gp",
  "video/x-ms-wmv": "wmv",
  "video/x-flv": "flv",
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
 * Identifies a file by its magic bytes. The browser supplied MIME type is not
 * trusted: it is frequently wrong (e.g. "application/octet-stream" for .mp4 on
 * Windows) and it is attacker controlled.
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
  // ISO base media file format: MP4, M4V, 3GP, MOV and AVIF start with an "ftyp" box
  if (ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);
    if (brand === "qt  ") return "video/quicktime";
    if (brand === "avif" || brand === "avis") return "image/avif";
    if (["3gp4", "3gp5", "3gp6", "3g2a", "3gsf", "3gpp"].includes(brand)) return "video/3gpp";
    if (brand === "M4V " || brand === "M4V" || brand === "m4v ") return "video/x-m4v";
    if (
      ["isom", "iso2", "iso4", "iso5", "iso6", "iso8", "iso9", "mp41", "mp42", "avc1", "avc3", "dash", "mmp4", "M4A "].includes(
        brand
      )
    ) {
      return "video/mp4";
    }
    return null;
  }
  // Matroska / WebM: EBML header. The DocType string further in tells them apart.
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    const head = ascii(bytes, 0, Math.min(bytes.length, 256));
    if (head.includes("matroska")) return "video/x-matroska";
    return "video/webm";
  }
  // MPEG program stream
  if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && (bytes[3] === 0xba || bytes[3] === 0xb3)) {
    return "video/mpeg";
  }
  // FLV
  if (ascii(bytes, 0, 3) === "FLV" && bytes[3] === 0x01) return "video/x-flv";
  // ASF container (WMV / ASF)
  if (
    bytes[0] === 0x30 &&
    bytes[1] === 0x26 &&
    bytes[2] === 0xb2 &&
    bytes[3] === 0x75 &&
    bytes[4] === 0x8e &&
    bytes[5] === 0x66 &&
    bytes[6] === 0xcf &&
    bytes[7] === 0x11
  ) {
    return "video/x-ms-wmv";
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
  /** True when the file content matched a known signature. */
  contentVerified: boolean;
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
 * Validates a selected file against the storage allow-list using the real file
 * content, then returns the canonical type to store it with.
 *
 * A file is never rejected only because the browser reported a missing or
 * unusual MIME type: the file content decides. When the content cannot be
 * identified at all, the file extension is used, and the storage bucket still
 * enforces its own allow-list server side.
 */
export async function resolveUpload(file: File): Promise<ResolvedUpload> {
  const name = file.name || "file";
  const extension = (name.split(".").pop() || "").toLowerCase();
  const fromExtension = EXTENSION_TO_MIME[extension] ?? null;
  const reported = (file.type || "").toLowerCase().split(";")[0].trim();

  const header = new Uint8Array(await file.slice(0, 256).arrayBuffer());
  const sniffed = sniffMimeType(header);

  // 1. Content identified: the file content is authoritative.
  if (sniffed) {
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
    const reportedKind = kindForMimeType(reported);
    return {
      kind: sniffedKind,
      contentType: sniffed,
      extension: MIME_TO_EXTENSION[sniffed] ?? extension,
      browserTypeMismatch: Boolean(reportedKind) && reportedKind !== sniffedKind,
      contentVerified: true,
    };
  }

  // 2. Content not recognised: fall back to the extension. A missing or unusual
  //    browser MIME type must not be the reason a legitimate file is rejected.
  if (fromExtension) {
    const kind = kindForMimeType(fromExtension)!;
    return {
      kind,
      contentType: fromExtension,
      extension: MIME_TO_EXTENSION[fromExtension] ?? extension,
      browserTypeMismatch: false,
      contentVerified: false,
    };
  }

  throw new MediaValidationError(
    `"${name}" is not a supported file. Allowed types: ${ALLOWED_UPLOAD_TYPES.join(", ")}.`
  );
}

/** Video formats that browsers can play back directly. */
const BROWSER_PLAYABLE_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];
/** Formats that only play when the codec is H.264/AAC (Safari, iOS, Chrome). */
const CONDITIONAL_VIDEO_TYPES = ["video/quicktime", "video/x-m4v"];

export function isBrowserPlayableVideo(contentType: string): boolean {
  return BROWSER_PLAYABLE_VIDEO_TYPES.includes(contentType);
}

export function isConditionallyPlayableVideo(contentType: string): boolean {
  return CONDITIONAL_VIDEO_TYPES.includes(contentType);
}

/** Human readable playback compatibility note for the admin interface. */
export function videoCompatibilityNote(contentType: string): string | null {
  if (isBrowserPlayableVideo(contentType)) return null;
  if (isConditionallyPlayableVideo(contentType)) {
    return "Plays in Safari, Chrome and iOS when the file is encoded as H.264/AAC.";
  }
  return "This format cannot be played by most browsers. Upload an MP4 (H.264) or WebM version for the website gallery.";
}

/** Video type inferred from a stored URL (used by the public gallery). */
export function videoTypeFromUrl(url: string): string | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  const match = lower.match(/\.([a-z0-9]{2,5})(?:\?.*)?$/);
  if (!match) return null;
  return EXTENSION_TO_MIME[match[1]] ?? null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Maximum accepted size per kind.
 *
 * The video limit matches the storage bucket's file_size_limit. The platform
 * rejects a bucket limit above 50 MB with "413 Payload too large", so 50 MB is
 * the largest per-file video the current project plan supports.
 */
export function maxUploadBytes(kind: MediaUploadKind): number {
  return kind === "video" ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
}

/** Files at or above this size are uploaded with the resumable protocol. */
export const RESUMABLE_UPLOAD_THRESHOLD = 4 * 1024 * 1024;

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
  if (m.includes("already exists") || m.includes("duplicate")) {
    return "A file with that name already exists. Rename the file and try again.";
  }
  if (m.includes("not found") || m.includes("404")) {
    return "The media bucket could not be found. Check the storage configuration.";
  }
  return message || "The upload failed. Please try again.";
}
