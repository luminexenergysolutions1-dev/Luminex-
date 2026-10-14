/** True when a URL points at a video file (by extension). */
export function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm|avi|m4v|3gp|mkv)(\?.*)?$/i.test(url || "");
}

export const MEDIA_FIT = "h-full w-full object-cover";
