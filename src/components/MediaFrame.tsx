import { isVideoUrl, videoCompatibilityNote, videoTypeFromUrl } from "@/utils/media";

/**
 * Renders an image or a video depending on the file URL.
 * Videos autoplay muted and loop so they behave like background media.
 *
 * Video formats that browsers cannot decode (MKV, AVI, WMV, FLV, 3GP, MPEG)
 * are not rendered as a broken player: a link to the original file is shown
 * instead, with a short explanation.
 */
export function MediaFrame({
  url,
  alt = "",
  className = "h-full w-full object-cover",
  showPlayBadge = false,
}: {
  url: string;
  alt?: string;
  className?: string;
  showPlayBadge?: boolean;
}) {
  if (isVideoUrl(url)) {
    const type = videoTypeFromUrl(url);
    const note = type ? videoCompatibilityNote(type) : null;
    if (note) {
      return (
        <div className={`relative flex flex-col items-center justify-center gap-1 bg-charcoal/90 p-3 text-center ${className}`}>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/80">Video</span>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-white underline underline-offset-2"
          >
            Open video
          </a>
        </div>
      );
    }
    return (
      <>
        <video
          src={url}
          className={className}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={alt || "Video"}
        />
        {showPlayBadge && (
          <span className="absolute inset-0 grid place-items-center text-white bg-charcoal/25 pointer-events-none">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        )}
      </>
    );
  }
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}
