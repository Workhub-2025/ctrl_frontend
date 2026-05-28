"use client";

import { useEffect, useRef, useState } from "react";

import { BrandMark } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

import styles from "./premium-hero-scene.module.css";

type PremiumHeroSceneProps = {
  className?: string;
};

export function PremiumHeroScene({ className }: PremiumHeroSceneProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updateMotionPreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);

    return () =>
      mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsVideoReady(false);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    let frameId = 0;
    let isDisposed = false;

    const getSceneSizing = () => {
      if (window.innerWidth <= 767) {
        return { objectPositionX: 0.84, scale: 1.3 };
      }

      if (window.innerWidth <= 1279) {
        return { objectPositionX: 0.9, scale: 1.28 };
      }

      return { objectPositionX: 0.88, scale: 1.24 };
    };

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.max(1, Math.round(bounds.width * ratio));
      canvas.height = Math.max(1, Math.round(bounds.height * ratio));
    };

    const drawFrame = () => {
      if (isDisposed) {
        return;
      }

      if (video.readyState >= 2 && canvas.width > 0 && canvas.height > 0) {
        const { objectPositionX, scale } = getSceneSizing();
        const coverScale =
          Math.max(
            canvas.width / video.videoWidth,
            canvas.height / video.videoHeight
          ) * scale;
        const drawWidth = video.videoWidth * coverScale;
        const drawHeight = video.videoHeight * coverScale;
        const drawX = (canvas.width - drawWidth) * objectPositionX;
        const drawY = (canvas.height - drawHeight) * 0.5;

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(video, drawX, drawY, drawWidth, drawHeight);
      }

      frameId = window.requestAnimationFrame(drawFrame);
    };

    const startPlayback = () => {
      resizeCanvas();
      setIsVideoReady(true);
      void video.play().catch(() => {
        setIsVideoReady(false);
      });
    };

    resizeCanvas();
    drawFrame();

    video.addEventListener("loadeddata", startPlayback);
    window.addEventListener("resize", resizeCanvas);

    if (video.readyState >= 2) {
      startPlayback();
    }

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resizeCanvas);
      video.removeEventListener("loadeddata", startPlayback);
      video.pause();
    };
  }, [prefersReducedMotion]);

  return (
    <div aria-hidden="true" className={cn(styles.scene, className)}>
      <img
        src="/assets/ctrl-hero-poster.png"
        alt=""
        className={styles.poster}
        decoding="async"
        loading="eager"
      />

      {!prefersReducedMotion ? (
        <>
          <canvas
            ref={canvasRef}
            className={cn(styles.canvas, isVideoReady && styles.canvasReady)}
          />
          <video
            ref={videoRef}
            className={styles.hiddenVideo}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/assets/ctrl-hero-poster.png"
            disablePictureInPicture
            disableRemotePlayback
            controlsList="nodownload nofullscreen noplaybackrate noremoteplayback"
            tabIndex={-1}
            aria-hidden="true"
          >
            <source src="/assets/ctrl-hero-reference.mp4" type="video/mp4" />
          </video>
        </>
      ) : null}

      <div className={styles.topMask} />
      <div className={styles.leftMask} />
      <div className={styles.copyMask} />
      <div className={styles.bottomMask} />
      <div className={styles.vignette} />
      <div className={styles.tone} />
      <div className={styles.noise} />
      <div className={styles.edgeGlow} />

      <div className={styles.routeLine} />

      <div className={`${styles.pulse} ${styles.pulseA}`} />
      <div className={`${styles.pulse} ${styles.pulseB}`} />

      <div className={`${styles.chip} ${styles.chipTop}`}>
        <span className={styles.chipDot} />
        Signal routing
      </div>

      <div className={`${styles.chip} ${styles.chipBottom}`}>
        <BrandMark className="w-5 text-cyan-200/90" />
        <span>CTRL decision layer</span>
      </div>
    </div>
  );
}
