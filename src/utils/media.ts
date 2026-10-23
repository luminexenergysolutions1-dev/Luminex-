/**
 * Media utilities for format detection, compatibility checks, and format handling
 */

export type MediaKind = "image" | "video" | "pdf" | "unknown";

export interface MediaInfo {
  kind: "image" | "video" | "pdf" | "unknown";
  mimeType: string;
  extension: string;
  isBrowserPlayable: boolean;
  recommendedFormat?: string;
  warning?: string;
}

// MIME types that are natively playable in modern browsers without conversion
export const BROWSER_PLAYABLE_VIDEO_TYPES = [
  "video/mp4",      // H.264/H.265 + AAC - universal support
  "video/webm",     // VP8/VP9 + Vorbis/Opus - Chrome, Firefox, Edge
  "video/ogg",      // Theora/Vorbis - Firefox, Chrome
] as const;

// MIME types that may work in some browsers but not all
export const CONDITIONALLY_PLAYABLE_VIDEO_TYPES = [
  "video/quicktime",     // MOV - Safari, some Chrome (needs H.264)
  "video/x-m4v",         // M4V - Safari, some Chrome (H.264)
] as const;

// Video types that need conversion for browser playback
export const NEEDS_CONVERSION_VIDEO_TYPES = [
  "video/x-matroska",     // MKV - needs conversion
  "video/x-msvideo",      // AVI - needs conversion
  "video/x-m4v",          // M4V - may work in Safari
  "video/mpeg",           // MPEG/MPG - old format
  "video/3gpp",           // 3GP - mobile format
  "video/x-ms-wmv",       // WMV - Windows only
  "video/x-flv",          // FLV - Flash, deprecated
  "video/x-ms-wmv",       // WMV
  "video/x-flv",          // FLV
] as const;

export const ALLOWED_VIDEO_TYPES = [
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
  "video/ogg",
  "video/mp2t",
] as const;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/bmp",
  "image/tiff",
  "image/svg+xml",
] as const;

export const ALLOWED_PDF_TYPES = ["application/pdf"] as const;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/bmp",
  "image/tiff",
  "image/svg+xml",
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
  "video/ogg",
  "video/mp2t",
  "application/pdf",
] as const;

// File size limits
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB for images
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB for videos

export interface MediaInfo {
  kind: "image" | "video" | "pdf" | "unknown";
  mimeType: string;
  extension: string;
  isBrowserPlayable: boolean;
  recommendedFormat?: string;
  warning?: string;
}

/**
 * Get the file extension from a MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-matroska": "mkv",
    "video/x-msvideo": "avi",
    "video/x-m4v": "m4v",
    "video/mpeg": "mpeg",
    "video/3gpp": "3gp",
    "video/x-ms-wmv": "wmv",
    "video/x-flv": "flv",
    "video/ogg": "ogv",
    "video/mp2t": "ts",
    "application/pdf": "pdf",
  };
  return mimeToExt[mimeType] || "bin";
}

/**
 * Get media info from MIME type
 */
export function getMediaInfo(mimeType: string): {
  kind: "image" | "video" | "pdf" | "unknown";
  isBrowserPlayable: boolean;
  warning?: string;
  recommendedFormat?: string;
} {
  const browserPlayableVideo = [
    "video/mp4",
    "video/webm",
    "video/ogg",
  ];
  
  const conditionallyPlayable = [
    "video/quicktime",
    "video/x-m4v",
  ];
  
  const needsConversion = [
    "video/x-matroska",
    "video/x-msvideo",
    "video/x-m4v",
    "video/mpeg",
    "video/3gpp",
    "video/x-ms-wmv",
    "video/x-flv",
    "video/x-matroska",
    "video/x-msvideo",
  ];
  
  const isImage = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "image/gif",
    "image/bmp",
    "image/tiff",
    "image/svg+xml",
  ].includes(mimeType);
  
  const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType);
  const isPdf = mimeType === "application/pdf";
  
  let kind: "image" | "video" | "pdf" | "unknown" = "unknown";
  let isBrowserPlayable = false;
  let warning: string | undefined;
  let recommendedFormat: string | undefined;
  
  if (isImage) {
    kind = "image";
    isBrowserPlayable = true;
    // SVG needs special handling - sanitize
    if (mimeType === "image/svg+xml") {
      recommendedFormat = "webp"; // Convert SVG to WebP for safety
    }
  } else if (isVideo) {
    kind = "video";
    if (["video/mp4", "video/webm", "video/ogg"].includes(mimeType)) {
      isBrowserPlayable = true;
    } else if (["video/quicktime", "video/x-m4v"].includes(mimeType)) {
      isBrowserPlayable = true; // May work in Safari
    } else {
      isBrowserPlayable = false;
      recommendedFormat = "mp4"; // Recommend MP4/H.264
      warning = `This video format (${mimeType}) is not playable in most browsers. Convert to MP4 (H.264/AAC) or WebM (VP9) for universal playback.`;
    }
  } else if (mimeType === "application/pdf") {
    kind = "pdf";
    isBrowserPlayable = true; // PDFs can be viewed in-browser
  } else {
    kind = "unknown";
  }
  
  return { kind, isBrowserPlayable, warning, recommendedFormat };
}

/**
 * Check if a video MIME type is natively playable in modern browsers
 */
export function isBrowserPlayableVideo(mimeType: string): boolean {
  return ["video/mp4", "video/webm", "video/ogg"].includes(mimeType);
}

/**
 * Get the recommended output format for a video based on its input format
 */
export function getRecommendedVideoFormat(inputMimeType: string): string {
  const formatMap: Record<string, string> = {
    "video/quicktime": "mp4",
    "video/x-matroska": "mp4",
    "video/x-msvideo": "mp4",
    "video/x-m4v": "mp4",
    "video/mpeg": "mp4",
    "video/3gpp": "mp4",
    "video/x-ms-wmv": "mp4",
    "video/x-flv": "mp4",
    "video/x-matroska": "mp4",
    "video/x-msvideo": "mp4",
  };
  return formatMap[inputMimeType] || "mp4";
}

/**
 * Get video type from URL
 */
export function videoTypeFromUrl(url: string): string | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  const match = lower.match(/\.([a-z0-9]{2,5})(?:\?.*)?$/);
  if (!match) return null;
  const ext = match[1];
  const extToMime: Record<string, string> = {
    "mp4": "video/mp4",
    "webm": "video/webm",
    "mov": "video/quicktime",
    "mkv": "video/x-matroska",
    "avi": "video/x-msvideo",
    "m4v": "video/x-m4v",
    "mpeg": "video/mpeg",
    "mpg": "video/mpeg",
    "3gp": "video/3gpp",
    "wmv": "video/x-ms-wmv",
    "flv": "video/x-flv",
    "ogv": "video/ogg",
    "ts": "video/mp2t",
  };
  return extToMime[ext] || null;
}

/**
 * Get video compatibility note for display
 */
export function videoCompatibilityNote(mimeType: string): string | null {
  if (["video/mp4", "video/webm", "video/ogg"].includes(mimeType)) {
    return null; // Fully playable
  }
  if (["video/quicktime", "video/x-m4v"].includes(mimeType)) {
    return "Plays in Safari and Chrome (requires H.264/AAC codec)";
  }
  return "This video format cannot be played in most browsers. Convert to MP4 (H.264) or WebM for universal playback.";
}

/**
 * Check if a URL points to a video file
 */
export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  const videoMimeTypes = [
    "video/mp4", "video/webm", "video/quicktime", "video/avi",
    "video/m4v", "video/3gp", "video/mkv", "video/x-msvideo",
    "video/mpeg", "video/mpg", "video/wmv", "video/flv",
    "video/x-msvideo", "video/x-matroska", "video/x-m4v",
    "video/mpeg", "video/mpg", "video/wmv", "video/flv",
    "video/x-flv", "video/ogg", "video/mp2t"
  ];
  if (videoMimeTypes.some((t) => lower.startsWith(t + "/") || lower === t)) return true;
  return /\.(mp4|mov|webm|avi|m4v|3gp|mkv|mpg|mpeg|wmv|flv|mkv|threep)(\?.*)?$/i.test(lower);
}

/**
 * Validate file against allowed types and size limits
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const allowedImageTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "image/gif",
    "image/bmp",
    "image/tiff",
    "image/svg+xml",
  ];
  
  const allowedVideoTypes = [
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
    "video/ogg",
    "video/mp2t",
  ];
  
  const allowedTypes = [
    ...ALLOWED_IMAGE_TYPES,
    ...ALLOWED_VIDEO_TYPES,
    "application/pdf",
  ];
  
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
  
  if (!file) {
    return { valid: false, error: "No file provided" };
  }
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: `Unsupported file type: ${file.type}. Supported formats: images (JPG, PNG, WebP, AVIF, GIF, BMP, TIFF, SVG), videos (MP4, WebM, MOV, MKV, AVI, M4V, MPEG, 3GP, WMV, FLV, OGG, TS), PDF` 
    };
  }
  
  // Check file size based on type
  if (file.type.startsWith("video/")) {
    if (file.size > MAX_VIDEO_SIZE) {
      return { valid: false, error: "Video file must be under 100MB" };
    }
  } else if (file.type.startsWith("image/")) {
    if (file.size > MAX_IMAGE_SIZE) {
      return { valid: false, error: "Image file must be under 20MB" };
    }
  } else if (file.type === "application/pdf") {
    if (file.size > 20 * 1024 * 1024) {
      return { valid: false, error: "PDF file must be under 20MB" };
    }
  }
  
  return { valid: true };
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}