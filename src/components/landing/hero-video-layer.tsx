"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import styles from "./hero-video-layer.module.css";

type CropSetting = {
  x: number;
  y?: number;
  scale: number;
};

type CropConfig = {
  desktop: CropSetting;
  tablet?: CropSetting;
  mobile?: CropSetting;
};

type HeroVideoLayerProps = {
  active: boolean;
  className?: string;
  crop: CropConfig;
  mobilePosterSrc?: string;
  mobileSrc?: string;
  posterSrc: string;
  priority?: boolean;
  src: string;
};

function getCropForWidth(width: number, crop: CropConfig): CropSetting {
  if (width <= 767) {
    return crop.mobile ?? crop.tablet ?? crop.desktop;
  }

  if (width <= 1279) {
    return crop.tablet ?? crop.desktop;
  }

  return crop.desktop;
}

export function HeroVideoLayer({
  active,
  className,
  crop,
  mobilePosterSrc,
  mobileSrc,
  posterSrc,
  priority = false,
  src,
}: HeroVideoLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1440);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updateMotionPreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    const updateViewportWidth = () => {
      setViewportWidth(window.innerWidth);
    };

    updateMotionPreference();
    updateViewportWidth();

    mediaQuery.addEventListener("change", updateMotionPreference);
    window.addEventListener("resize", updateViewportWidth);

    return () => {
      mediaQuery.removeEventListener("change", updateMotionPreference);
      window.removeEventListener("resize", updateViewportWidth);
    };
  }, []);

  const selectedSrc = viewportWidth <= 767 && mobileSrc ? mobileSrc : src;
  const selectedPoster =
    viewportWidth <= 767 && mobilePosterSrc ? mobilePosterSrc : posterSrc;

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || prefersReducedMotion) {
      setIsVideoReady(false);
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      setIsVideoReady(false);
      return;
    }

    let frameId = 0;
    let isDisposed = false;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.max(1, Math.round(bounds.width * ratio));
      canvas.height = Math.max(1, Math.round(bounds.height * ratio));
    };

    const drawFrame = () => {
      if (
        isDisposed ||
        video.readyState < 2 ||
        canvas.width === 0 ||
        canvas.height === 0
      ) {
        return;
      }

      const currentCrop = getCropForWidth(window.innerWidth, crop);
      const coverScale =
        Math.max(
          canvas.width / Math.max(video.videoWidth, 1),
          canvas.height / Math.max(video.videoHeight, 1)
        ) * currentCrop.scale;
      const drawWidth = video.videoWidth * coverScale;
      const drawHeight = video.videoHeight * coverScale;
      const drawX = (canvas.width - drawWidth) * currentCrop.x;
      const drawY = (canvas.height - drawHeight) * (currentCrop.y ?? 0.5);

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(video, drawX, drawY, drawWidth, drawHeight);
    };

    const drawLoop = () => {
      drawFrame();

      if (active && !isDisposed) {
        frameId = window.requestAnimationFrame(drawLoop);
      }
    };

    const startPlayback = async () => {
      resizeCanvas();

      if (!active) {
        video.pause();
        return;
      }

      try {
        video.currentTime = 0;
      } catch {}

      try {
        await video.play();
        if (!isDisposed) {
          setIsVideoReady(true);
          drawLoop();
        }
      } catch {
        if (!isDisposed) {
          setIsVideoReady(false);
        }
      }
    };

    const handleLoadedData = () => {
      if (active) {
        void startPlayback();
      }
    };

    const handleResize = () => {
      resizeCanvas();
      drawFrame();
    };

    resizeCanvas();
    drawFrame();
    video.load();

    video.addEventListener("loadeddata", handleLoadedData);
    window.addEventListener("resize", handleResize);

    if (active) {
      if (video.readyState >= 2) {
        void startPlayback();
      }
    } else {
      video.pause();
    }

    return () => {
      isDisposed = true;
      video.pause();
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      video.removeEventListener("loadeddata", handleLoadedData);
    };
  }, [active, crop, prefersReducedMotion, selectedSrc]);

  const posterCrop = getCropForWidth(viewportWidth, crop);

  return (
    <div
      aria-hidden="true"
      className={cn(
        styles.layer,
        active ? styles.active : styles.inactive,
        className
      )}
    >
      <img
        src={selectedPoster}
        alt=""
        className={styles.poster}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        loading={priority ? "eager" : "lazy"}
        style={{
          objectPosition: `${posterCrop.x * 100}% ${(posterCrop.y ?? 0.5) * 100}%`,
          transform: `scale(${posterCrop.scale})`,
        }}
      />

      {!prefersReducedMotion ? (
        <>
          <canvas
            ref={canvasRef}
            className={cn(styles.canvas, isVideoReady && styles.canvasReady)}
          />
          <video
            key={selectedSrc}
            ref={videoRef}
            className={styles.hiddenVideo}
            autoPlay={active}
            loop
            muted
            playsInline
            poster={selectedPoster}
            preload={active || priority ? "auto" : "metadata"}
            disablePictureInPicture
            disableRemotePlayback
            controlsList="nodownload nofullscreen noplaybackrate noremoteplayback"
            tabIndex={-1}
            aria-hidden="true"
            onError={() => setIsVideoReady(false)}
          >
            <source src={selectedSrc} type="video/mp4" />
          </video>
        </>
      ) : null}
    </div>
  );
}
