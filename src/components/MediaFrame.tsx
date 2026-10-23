import { cn } from "@/utils/cn";
import { isVideoUrl, videoCompatibilityNote, videoTypeFromUrl, isBrowserPlayableVideo } from "@/utils/media";

/**
 * Renders an image or a video depending on the file URL.
 * Videos autoplay muted and loop so they behave like background media.
 * For non-browser-playable formats, shows a placeholder with a download link.
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
  if (!url) {
    return (
      <div className={`${className} bg-soft flex items-center justify-center`}>
        <span className="text-xs text-charcoal/50">No media</span>
      </div>
    );
  }

  if (isVideoUrl(url)) {
    const type = videoTypeFromUrl(url);
    const note = type ? videoCompatibilityNote(type) : null;
    
    // For non-playable formats, show a download link instead of broken player
    if (note) {
      return (
        <div className="relative flex flex-col items-center justify-center gap-2 bg-charcoal/5 p-4 rounded-xl">
          <svg className="w-12 h-12 text-charcoal/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.557.894l3.197-2.132a1 1 0 000-1.788z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-charcoal">Video Format Not Playable</p>
          <p className="text-xs text-charcoal/60 text-center max-w-xs">
            This video format cannot be played in the browser.{" "}
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-energy underline hover:text-energy-dark">
              Download to view
            </a>
          </p>
        </div>
      );
    }

    // Browser-playable video
    return (
      <>
        <video
          src={url}
          className={cn(className)}
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