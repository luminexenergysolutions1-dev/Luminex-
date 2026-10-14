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
