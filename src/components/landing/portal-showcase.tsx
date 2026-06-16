"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Film } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Looping portal walkthrough video for the Platform Overview section.
 *
 * Drop a 20–30s muted MP4 (ideally H.264, ~1920×1080) at:
 *   FrontEnd/public/assets/ctrl-portal-walkthrough.mp4
 * Optionally add a poster frame at:
 *   FrontEnd/public/assets/ctrl-portal-walkthrough-poster.jpg
 *
 * The clip is intended to spend ~5–10s on each of the three portals
 * (Candidate, Hiring Manager, Client) in a single continuous run.
 */
const VIDEO_SRC = "/assets/ctrl-portal-walkthrough.mp4";
const POSTER_SRC = "/assets/ctrl-portal-walkthrough-poster.jpg";

const portals = ["Candidate", "Hiring Manager", "Client"];

export function PortalShowcase({
  reduceMotion = false,
  src = VIDEO_SRC,
  poster = POSTER_SRC,
}: {
  reduceMotion?: boolean;
  src?: string;
  poster?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(!reduceMotion);
  const [hasError, setHasError] = useState(false);

  // Honour reduced-motion: never autoplay moving content for those users.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (reduceMotion) {
      video.pause();
      setIsPlaying(false);
    }
  }, [reduceMotion]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };

  return (
    <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white/85 dark:bg-[#080808]/95 backdrop-blur-md shadow-lg dark:shadow-2xl">
      {/* Window chrome */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/60 dark:border-white/5 bg-slate-50 dark:bg-[#0a0a0a] px-5 py-3">
        <div className="flex gap-2">
          <span className="h-3 w-3 rounded-full bg-slate-300 dark:bg-white/10" />
          <span className="h-3 w-3 rounded-full bg-slate-300 dark:bg-white/10" />
          <span className="h-3 w-3 rounded-full bg-slate-300 dark:bg-white/10" />
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Product Walkthrough
        </div>
      </div>

      {/* Video stage */}
      <div className="relative aspect-video w-full bg-slate-100 dark:bg-[#050505]">
        {!hasError ? (
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            src={src}
            poster={poster}
            autoPlay={!reduceMotion}
            loop
            muted
            playsInline
            preload="metadata"
            aria-label="CTRL platform walkthrough showing the Candidate, Hiring Manager and Client portals"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={() => setHasError(true)}
          />
        ) : (
          // Graceful fallback until the walkthrough video is added.
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-500/[0.02] dark:from-white/[0.03] to-transparent pointer-events-none" />
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-slate-300 bg-slate-100 dark:border-white/10 dark:bg-white/5">
              <Film className="h-7 w-7 text-slate-500 dark:text-slate-300" aria-hidden="true" />
            </div>
            <h4 className="mb-2 text-balance text-lg font-medium text-slate-900 dark:text-white">
              Portal walkthrough video
            </h4>
            <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
              Add a 20–30s looping clip at{" "}
              <code className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[12px] text-slate-700 dark:bg-white/10 dark:text-slate-200">
                public/assets/ctrl-portal-walkthrough.mp4
              </code>{" "}
              to showcase all three portals.
            </p>
          </div>
        )}

        {/* Pause / play control — required for auto-playing motion (WCAG 2.2.2) */}
        {!hasError && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause walkthrough" : "Play walkthrough"}
            className="absolute bottom-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Play className="ml-0.5 h-5 w-5" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {/* Portal chapter markers */}
      <div className="flex items-stretch border-t border-slate-200/60 dark:border-white/5">
        {portals.map((portal, i) => (
          <div
            key={portal}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 px-4 py-3 text-center",
              i > 0 && "border-l border-slate-200/60 dark:border-white/5"
            )}
          >
            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
              0{i + 1}
            </span>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{portal}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
