import { isVideoUrl } from "@/utils/media";

/**
 * Renders an image or a video depending on the file URL.
 * Videos autoplay muted and loop so they behave like background media.
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
