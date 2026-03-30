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

type PingPongVideoLayerProps = {
  active?: boolean;
  className?: string;
  crop: CropConfig;
  mobilePosterSrc?: string;
  mobileReverseSrc?: string;
  mobileSrc?: string;
  posterSrc: string;
  priority?: boolean;
  reverseSrc?: string;
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

export function PingPongVideoLayer({
  active = true,
  className,
  crop,
  mobilePosterSrc,
  mobileReverseSrc,
  mobileSrc,
  posterSrc,
  priority = false,
  reverseSrc,
  src,
}: PingPongVideoLayerProps) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const forwardVideoRef = useRef<HTMLVideoElement | null>(null);
  const reverseVideoRef = useRef<HTMLVideoElement | null>(null);
  const activeModeRef = useRef<"forward" | "reverse">("forward");
  const [isVisible, setIsVisible] = useState(false);
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

  useEffect(() => {
    const layer = layerRef.current;

    if (!layer) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (!entry) {
          return;
        }

        setIsVisible(entry.isIntersecting && entry.intersectionRatio > 0.08);
      },
      {
        threshold: [0.08, 0.2, 0.35, 0.5],
      }
    );

    observer.observe(layer);

    return () => observer.disconnect();
  }, []);

  const selectedForwardSrc = viewportWidth <= 767 && mobileSrc ? mobileSrc : src;
  const selectedReverseSrc =
    viewportWidth <= 767 && mobileReverseSrc ? mobileReverseSrc : reverseSrc;
  const selectedPoster =
    viewportWidth <= 767 && mobilePosterSrc ? mobilePosterSrc : posterSrc;

  useEffect(() => {
    const forwardVideo = forwardVideoRef.current;
    const reverseVideo = reverseVideoRef.current;
    const canvas = canvasRef.current;

    if (!forwardVideo || !canvas || prefersReducedMotion) {
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

    const getVideoForMode = (mode: "forward" | "reverse") =>
      mode === "forward" ? forwardVideo : reverseVideo;

    const pauseVideo = (video: HTMLVideoElement | null) => {
      if (!video) {
        return;
      }

      video.pause();
      try {
        video.currentTime = 0;
      } catch {}
    };

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.max(1, Math.round(bounds.width * ratio));
      canvas.height = Math.max(1, Math.round(bounds.height * ratio));
    };

    const drawFrame = (video: HTMLVideoElement | null) => {
      if (
        isDisposed ||
        !video ||
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
      drawFrame(getVideoForMode(activeModeRef.current));

      if (active && isVisible && !isDisposed) {
        frameId = window.requestAnimationFrame(drawLoop);
      }
    };

    const playMode = async (
      mode: "forward" | "reverse",
      resetCurrentTime = true
    ) => {
      const currentVideo = getVideoForMode(mode);
      const otherVideo = getVideoForMode(mode === "forward" ? "reverse" : "forward");

      resizeCanvas();

      if (!currentVideo) {
        return false;
      }

      if (!active || !isVisible) {
        pauseVideo(currentVideo);
        return;
      }

      activeModeRef.current = mode;
      pauseVideo(otherVideo);

      if (currentVideo.readyState < 2) {
        setIsVideoReady(false);
        currentVideo.load();
        return false;
      }

      try {
        if (resetCurrentTime) {
          currentVideo.currentTime = 0;
        }
      } catch {}

      try {
        await currentVideo.play();
        if (!isDisposed) {
          setIsVideoReady(true);
        }
        return true;
      } catch {
        if (!isDisposed) {
          setIsVideoReady(false);
        }
        return false;
      }
    };

    const handleForwardLoadedData = () => {
      if (active && isVisible && activeModeRef.current === "forward") {
        void playMode("forward");
      }
    };

    const handleReverseLoadedData = () => {
      if (active && isVisible && activeModeRef.current === "reverse") {
        void playMode("reverse");
      }
    };

    const handleForwardEnded = () => {
      if (!selectedReverseSrc) {
        void playMode("forward");
        return;
      }

      void playMode("reverse");
    };

    const handleReverseEnded = () => {
      void playMode("forward");
    };

    const handleResize = () => {
      resizeCanvas();
      drawFrame(getVideoForMode(activeModeRef.current));
    };

    activeModeRef.current = "forward";
    resizeCanvas();
    drawFrame(forwardVideo);
    forwardVideo.load();
    reverseVideo?.load();

    forwardVideo.addEventListener("loadeddata", handleForwardLoadedData);
    forwardVideo.addEventListener("ended", handleForwardEnded);
    reverseVideo?.addEventListener("loadeddata", handleReverseLoadedData);
    reverseVideo?.addEventListener("ended", handleReverseEnded);
    window.addEventListener("resize", handleResize);

    if (active && isVisible) {
      void playMode("forward");
      frameId = window.requestAnimationFrame(drawLoop);
    } else {
      pauseVideo(forwardVideo);
      pauseVideo(reverseVideo);
    }

    return () => {
      isDisposed = true;
      pauseVideo(forwardVideo);
      pauseVideo(reverseVideo);
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      forwardVideo.removeEventListener("loadeddata", handleForwardLoadedData);
      forwardVideo.removeEventListener("ended", handleForwardEnded);
      reverseVideo?.removeEventListener("loadeddata", handleReverseLoadedData);
      reverseVideo?.removeEventListener("ended", handleReverseEnded);
    };
  }, [
    active,
    crop,
    isVisible,
    prefersReducedMotion,
    selectedForwardSrc,
    selectedReverseSrc,
  ]);

  const posterCrop = getCropForWidth(viewportWidth, crop);

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className={cn(styles.layer, styles.active, className)}
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
            key={selectedForwardSrc}
            ref={forwardVideoRef}
            className={styles.hiddenVideo}
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
            <source src={selectedForwardSrc} type="video/mp4" />
          </video>
          {selectedReverseSrc ? (
            <video
              key={selectedReverseSrc}
              ref={reverseVideoRef}
              className={styles.hiddenVideo}
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
              <source src={selectedReverseSrc} type="video/mp4" />
            </video>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
