"use client";

import { useState } from "react";
import MuxPlayer from "@mux/mux-player-react/lazy";

/**
 * Muted, looping autoplay movement video with tap-to-sound (Design › Motion).
 * Adaptive HLS from Mux keeps it light on mobile data.
 */
export function HeroVideo({
  playbackId,
  alt,
  className,
}: {
  playbackId: string;
  alt: string;
  className?: string;
}) {
  const [muted, setMuted] = useState(true);

  return (
    <div className={className ?? "bg-surface-sunk relative aspect-[4/5] w-full md:aspect-auto md:h-full"}>
      <MuxPlayer
        playbackId={playbackId}
        streamType="on-demand"
        autoPlay="muted"
        muted={muted}
        loop
        playsInline
        nohotkeys
        title={alt}
        aria-label={alt}
        className="absolute inset-0 size-full"
        style={
          {
            "--controls": "none",
            "--media-object-fit": "cover",
            aspectRatio: "auto",
          } as React.ComponentProps<typeof MuxPlayer>["style"]
        }
      />
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-pressed={!muted}
        className="label right-space-3 bottom-space-3 bg-surface px-space-3 text-ink absolute min-h-11"
      >
        {muted ? "Sound on" : "Sound off"}
      </button>
    </div>
  );
}
