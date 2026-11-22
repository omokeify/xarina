"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play, Plus, X } from "lucide-react";
import type { ProductDetail } from "@/lib/catalogue";
import { productMediaUrl } from "@/lib/supabase/media-url";
import { cn } from "@/lib/utils";
import { ProductImage } from "./product-image";
import { HeroVideo } from "./hero-video";

type Media = ProductDetail["media"][number];

/** "Movement reel (0:09)": the view's label, with its length for pan views. */
function viewLabel(m: Media) {
  if (m.effect === "pan" && m.duration_sec) {
    return `${m.label || "Movement reel"} (0:${String(m.duration_sec).padStart(2, "0")})`;
  }
  return m.label;
}

/**
 * PDP-2, concept gallery. Each design has several views of its photography:
 * the full photo, a slow-pan "movement reel" and zoomed close-ups (one image
 * file cropped by focus/zoom), plus any real Mux video.
 * Mobile: one full-bleed swipeable row. Desktop: a screen-tall frame with a
 * vertical thumbnail rail, a label on the photo, tap-to-zoom for stills and
 * play/pause for the movement reel.
 */
export function ProductGallery({ media, name }: { media: ProductDetail["media"]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [paused, setPaused] = useState(false);

  if (media.length === 0) {
    return <ProductImage path={null} alt={name} sizes="(min-width: 768px) 55vw, 100vw" />;
  }
  const current = media[active] ?? media[0];
  const isReel = current.type === "image" && current.effect === "pan";

  return (
    <>
      {/* Mobile row */}
      <div
        role="region"
        aria-label={`${name} gallery`}
        tabIndex={0}
        className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto md:hidden"
      >
        {media.map((m, i) => (
          <div key={m.id} className="relative w-full shrink-0 snap-center">
            <Frame media={m} priority={i === 0} />
            <ViewLabel media={m} />
          </div>
        ))}
      </div>

      {/* Desktop: fills the screen below the sticky header and stays put while details scroll. */}
      <div className="hidden md:sticky md:top-[57px] md:flex md:h-[calc(100svh-96px)] md:max-h-[960px]">
        <div className="relative h-full flex-1 overflow-hidden">
          {current.type === "video" || isReel ? (
            <>
              <Frame media={current} priority fill paused={paused} />
              {isReel && (
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  aria-label={paused ? "Play movement reel" : "Pause movement reel"}
                  className="right-space-4 bottom-space-4 border-line bg-surface text-ink absolute flex size-11 items-center justify-center border"
                >
                  {paused ? (
                    <Play aria-hidden className="size-4" />
                  ) : (
                    <Pause aria-hidden className="size-4" />
                  )}
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => setZoom(true)}
              aria-label="Enlarge photograph"
              className="group relative block h-full w-full cursor-zoom-in"
            >
              <Frame media={current} priority fill />
              <span className="right-space-4 border-line bg-surface text-ink absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center border">
                <Plus aria-hidden className="size-4" />
              </span>
            </button>
          )}
          <ViewLabel media={current} />
        </div>
        {media.length > 1 && (
          <ul
            aria-label="Choose a view"
            className="gap-space-2 p-space-3 flex w-24 shrink-0 flex-col justify-center overflow-y-auto"
          >
            {media.map((m, i) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActive(i);
                    setPaused(false);
                  }}
                  aria-label={`View ${viewLabel(m) || i + 1}`}
                  aria-pressed={i === active}
                  className={cn(
                    "relative block w-full overflow-hidden border transition-opacity",
                    i === active
                      ? "border-ink opacity-100"
                      : "border-transparent opacity-60 hover:opacity-100",
                  )}
                >
                  {m.type === "image" ? (
                    <ProductImage path={m.storage_path} alt="" sizes="96px" focus={m.focus} zoom={m.zoom} />
                  ) : (
                    <span className="bg-surface-sunk flex aspect-[4/5] w-full" />
                  )}
                  {(m.type === "video" || m.effect === "pan") && (
                    <span
                      data-theme="prive"
                      className="text-ink absolute inset-0 flex items-center justify-center"
                    >
                      <span className="bg-surface/70 flex size-7 items-center justify-center">
                        <Play aria-hidden className="size-3" />
                      </span>
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {zoom && current.type === "image" && current.storage_path && (
        <Lightbox path={current.storage_path} alt={current.alt || name} onClose={() => setZoom(false)} />
      )}
    </>
  );
}

/** The view's label on a solid band in the bottom-left corner (concept). */
function ViewLabel({ media }: { media: Media }) {
  const text = viewLabel(media);
  if (!text) return null;
  return (
    <span className="label bg-surface text-ink bottom-space-4 left-space-4 px-space-2 py-space-1 pointer-events-none absolute">
      {text}
    </span>
  );
}

/** One media item: 4:5 in the mobile row, or filling its frame (`fill`) on desktop. */
function Frame({
  media,
  priority,
  fill = false,
  paused = false,
}: {
  media: Media;
  priority?: boolean;
  fill?: boolean;
  paused?: boolean;
}) {
  return media.type === "video" && media.mux_playback_id ? (
    <HeroVideo
      playbackId={media.mux_playback_id}
      alt={media.alt}
      className={fill ? "bg-surface-sunk absolute inset-0" : "bg-surface-sunk relative aspect-[4/5] w-full"}
    />
  ) : (
    <ProductImage
      path={media.storage_path}
      alt={media.alt}
      sizes="(min-width: 768px) 55vw, 100vw"
      priority={priority}
      focus={media.focus}
      zoom={media.zoom}
      pan={media.effect === "pan"}
      paused={paused}
      className={fill ? "absolute inset-0 aspect-auto h-full" : undefined}
    />
  );
}

function Lightbox({ path, alt, onClose }: { path: string; alt: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged photograph"
      className="bg-surface-sunk p-space-4 fixed inset-0 z-50 flex items-center justify-center"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="top-space-4 right-space-4 border-line bg-surface text-ink absolute z-10 flex size-11 items-center justify-center border"
      >
        <X aria-hidden className="size-5" />
      </button>
      <div className="relative h-[88svh] w-full max-w-3xl">
        <Image
          src={productMediaUrl(path)}
          alt={alt}
          fill
          sizes="(min-width: 768px) 768px, 100vw"
          className="object-contain"
        />
      </div>
    </div>
  );
}
