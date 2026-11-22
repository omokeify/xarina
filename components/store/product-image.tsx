import Image from "next/image";
import { productMediaUrl } from "@/lib/supabase/media-url";
import { cn } from "@/lib/utils";

/**
 * 4:5 product image, or a quiet placeholder while photography is missing.
 * `focus` (CSS object-position) and `zoom` crop one photo into a close-up view
 * (concept gallery); `pan` slowly moves it, for the movement-reel view.
 */
export function ProductImage({
  path,
  alt,
  sizes,
  priority = false,
  className,
  focus,
  zoom = 1,
  pan = false,
  paused = false,
}: {
  path: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  focus?: string | null;
  zoom?: number;
  pan?: boolean;
  /** Pause the pan (play/pause control on the movement-reel view). */
  paused?: boolean;
}) {
  return (
    <div className={cn("bg-surface-sunk relative aspect-[4/5] w-full overflow-hidden", className)}>
      {path ? (
        <Image
          src={productMediaUrl(path)}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn(
            "object-cover transition-opacity duration-700 motion-reduce:transition-none",
            pan && "animate-movement-reel",
          )}
          style={{
            objectPosition: focus ?? undefined,
            transform: zoom !== 1 ? `scale(${zoom})` : undefined,
            transformOrigin: focus ?? undefined,
            animationPlayState: paused ? "paused" : undefined,
          }}
        />
      ) : (
        <span role="img" aria-label={alt} className="block h-full" />
      )}
    </div>
  );
}
