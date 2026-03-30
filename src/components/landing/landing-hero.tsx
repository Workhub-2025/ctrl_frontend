"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { HeroVideoLayer } from "./hero-video-layer";

const heroScenes = [
  {
    id: "decision-flow",
    index: "01",
    kicker: "Decision consistency",
    title: "Hiring the right people starts with the right intelligence.",
    body:
      "Built on deep operational insights and behavioural science",
    overlayClass:
      "bg-[radial-gradient(circle_at_82%_20%,rgba(150,170,198,0.18),transparent_18%),radial-gradient(circle_at_18%_18%,rgba(74,214,255,0.14),transparent_22%),radial-gradient(circle_at_50%_92%,rgba(4,7,13,0.22),transparent_40%)]",
    crop: {
      desktop: { x: 0.66, scale: 1.14 },
      tablet: { x: 0.7, scale: 1.18 },
      mobile: { x: 0.5, y: 0.44, scale: 1.08 },
    },
    mobilePosterSrc: "/assets/landing-hero/decision-consistency-mobile-poster.png",
    mobileVideoSrc: "/assets/landing-hero/decision-consistency-mobile.mp4",
    posterSrc: "/assets/landing-hero/decision-flow-poster.png",
    videoSrc: "/assets/landing-hero/decision-flow.mp4",
  },
  {
    id: "control-under-pressure",
    index: "02",
    kicker: "Pressure-tested performance",
    title: "Identify composure where it actually matters.",
    body:
      "See how candidates perform as conditions change and pace increases.",
    overlayClass:
      "bg-[radial-gradient(circle_at_82%_18%,rgba(89,221,255,0.2),transparent_22%),radial-gradient(circle_at_18%_82%,rgba(27,125,164,0.2),transparent_20%),radial-gradient(circle_at_50%_92%,rgba(4,7,13,0.18),transparent_40%)]",
    crop: {
      desktop: { x: 0.72, scale: 1.18 },
      tablet: { x: 0.76, scale: 1.24 },
      mobile: { x: 0.5, y: 0.52, scale: 1.06 },
    },
    mobilePosterSrc:
      "/assets/landing-hero/pressure-tested-performance-mobile-poster.png",
    mobileVideoSrc: "/assets/landing-hero/pressure-tested-performance-mobile.mp4",
    posterSrc: "/assets/landing-hero/control-under-pressure-poster.png",
    videoSrc: "/assets/landing-hero/control-under-pressure.mp4",
  },
  {
    id: "human-clarity",
    index: "03",
    kicker: "Signal over noise",
    title: "Giving hiring teams clear, defensible insights.",
    body: "Measure what matters, not what's easy",
    overlayClass:
      "bg-[radial-gradient(circle_at_78%_18%,rgba(255,184,118,0.14),transparent_20%),radial-gradient(circle_at_16%_20%,rgba(69,123,217,0.18),transparent_24%),radial-gradient(circle_at_50%_92%,rgba(4,7,13,0.2),transparent_42%)]",
    crop: {
      desktop: { x: 0.72, scale: 1.2 },
      tablet: { x: 0.75, scale: 1.24 },
      mobile: { x: 0.5, y: 0.42, scale: 1.04 },
    },
    mobilePosterSrc: "/assets/landing-hero/signal-over-noise-mobile-poster.png",
    mobileVideoSrc: "/assets/landing-hero/signal-over-noise-mobile.mp4",
    posterSrc: "/assets/landing-hero/human-clarity-poster.png",
    videoSrc: "/assets/landing-hero/human-clarity.mp4",
  },
] as const;

function scrollToScene(id: string) {
  const target = document.getElementById(id);
  const nav = document.querySelector("nav");

  if (!target) {
    return;
  }

  const navHeight =
    nav instanceof HTMLElement ? nav.getBoundingClientRect().height : 0;
  const extraOffset = window.innerWidth >= 1024 ? 28 : 18;
  const top =
    target.getBoundingClientRect().top + window.scrollY - navHeight - extraOffset;

  window.scrollTo({
    top: Math.max(0, top),
    behavior: "smooth",
  });

  window.history.replaceState(null, "", `#${id}`);
}

type LandingHeroProps = {
  navHeight?: number;
};

function getHeroLayout(
  viewportWidth: number,
  viewportHeight: number,
  navHeight: number
) {
  const width = Math.max(viewportWidth, 360);
  const height = Math.max(viewportHeight, 640);
  const availableHeight = Math.max(height - navHeight, 420);
  const isPhone = width < 640;
  const isTablet = width < 1024;
  const isCompact = availableHeight < 760;
  const isTight = availableHeight < 670;
  const isUltraTight = availableHeight < 590;

  const topOffset = isPhone
    ? isUltraTight
      ? 12
      : isTight
        ? 18
        : 24
    : isUltraTight
      ? 16
      : isTight
        ? 22
        : isCompact
          ? 28
          : 40;

  const bottomOffset = isPhone ? (isUltraTight ? 12 : 18) : isUltraTight ? 12 : 20;
  const contentShift = isPhone
    ? isUltraTight
      ? -6
      : -12
    : isUltraTight
      ? -10
      : isTight
        ? -16
        : -22;
  const contentShiftAdjusted = isPhone
    ? isUltraTight
      ? -6
      : -12
    : contentShift;
  const contentAlignClass = "items-end";
  const copyWidth = isPhone
    ? "min(100%, 22.25rem)"
    : isTablet
      ? "min(100%, 38rem)"
      : isUltraTight
        ? "min(100%, 42rem)"
        : "min(100%, 46rem)";
  const headlineMeasure = isPhone
    ? "9.1ch"
    : isUltraTight
      ? "11.8ch"
      : isTight
        ? "11.2ch"
        : "10.6ch";
  const bodyMeasure = isPhone
    ? "min(100%, 26rem)"
    : isUltraTight
      ? "min(100%, 36rem)"
      : "min(100%, 32rem)";
  const titleSize = isPhone
    ? isUltraTight
      ? "clamp(2.32rem,10.9vw,3.35rem)"
      : "clamp(2.58rem,11.8vw,4.05rem)"
    : isUltraTight
      ? "clamp(3rem,5vw,4.5rem)"
      : isTight
        ? "clamp(3.25rem,5.5vw,4.95rem)"
        : isCompact
          ? "clamp(3.5rem,5.9vw,5.5rem)"
          : "clamp(3.9rem,6.3vw,6.25rem)";
  const bodySize = isPhone
    ? isUltraTight
      ? "1.02rem"
      : "1.06rem"
    : isUltraTight
      ? "0.98rem"
      : "1.04rem";
  const bodyLineHeight = isPhone ? (isUltraTight ? 1.48 : 1.58) : isUltraTight ? 1.52 : 1.62;
  const chipFont = isUltraTight ? "0.63rem" : "0.68rem";
  const chipPaddingX = isUltraTight ? "0.9rem" : "1rem";
  const chipPaddingY = isUltraTight ? "0.48rem" : "0.58rem";
  const ctaHeight = isUltraTight ? 42 : isTight ? 44 : 48;
  const ctaGap = isUltraTight ? "0.55rem" : "0.75rem";
  const ctaPaddingX = isUltraTight ? "1.05rem" : "1.35rem";
  const controlsGap = isUltraTight ? "0.6rem" : "0.8rem";
  const controlsPaddingTop = isUltraTight ? "0.75rem" : isTight ? "0.9rem" : "1rem";
  const controlsButtonHeight = isUltraTight ? 40 : isTight ? 42 : 46;
  const pillPadX = isUltraTight ? "0.78rem" : isTight ? "0.95rem" : "1rem";
  const pillPadY = isUltraTight ? "0.48rem" : isTight ? "0.56rem" : "0.62rem";
  const pillTextSize = isUltraTight ? "0.77rem" : "0.82rem";
  const pillIndexSize = isUltraTight ? "0.58rem" : "0.62rem";
  return {
    availableHeight,
    contentAlignClass,
    style: {
      "--hero-top-space": `${navHeight + topOffset}px`,
      "--hero-bottom-space": `${bottomOffset}px`,
      "--hero-copy-width": copyWidth,
      "--hero-copy-measure": headlineMeasure,
      "--hero-copy-body-width": bodyMeasure,
      "--hero-copy-shift": `${contentShiftAdjusted}px`,
      "--hero-title-size": titleSize,
      "--hero-body-size": bodySize,
      "--hero-body-line-height": `${bodyLineHeight}`,
      "--hero-chip-size": chipFont,
      "--hero-chip-pad-x": chipPaddingX,
      "--hero-chip-pad-y": chipPaddingY,
      "--hero-cta-height": `${ctaHeight}px`,
      "--hero-cta-gap": ctaGap,
      "--hero-cta-pad-x": ctaPaddingX,
      "--hero-controls-gap": controlsGap,
      "--hero-controls-pt": controlsPaddingTop,
      "--hero-controls-height": `${controlsButtonHeight}px`,
      "--hero-pill-pad-x": pillPadX,
      "--hero-pill-pad-y": pillPadY,
      "--hero-pill-text-size": pillTextSize,
      "--hero-pill-index-size": pillIndexSize,
    } as CSSProperties,
  };
}

export function LandingHero({ navHeight = 96 }: LandingHeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 1440, height: 900 });
  const cycleRef = useRef<number | null>(null);
  const pillTrackRef = useRef<HTMLDivElement | null>(null);
  const pillRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    const updateViewport = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updatePreference();
    updateViewport();
    mediaQuery.addEventListener("change", updatePreference);
    window.addEventListener("resize", updateViewport);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    cycleRef.current = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % heroScenes.length);
    }, 6800);

    return () => {
      if (cycleRef.current) {
        window.clearInterval(cycleRef.current);
      }
    };
  }, [prefersReducedMotion]);

  const currentScene = heroScenes[activeIndex];
  const heroLayout = useMemo(
    () =>
      getHeroLayout(
        viewportSize.width,
        viewportSize.height,
        Math.max(navHeight, 72)
      ),
    [navHeight, viewportSize.height, viewportSize.width]
  );

  useEffect(() => {
    if (viewportSize.width >= 640) {
      return;
    }

    const track = pillTrackRef.current;
    const activePill = pillRefs.current[activeIndex];

    if (!track || !activePill) {
      return;
    }

    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    const targetLeft = activePill.offsetLeft - (track.clientWidth - activePill.offsetWidth) / 2;

    track.scrollTo({
      left: Math.max(0, Math.min(targetLeft, maxScrollLeft)),
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [activeIndex, prefersReducedMotion, viewportSize.width]);

  const selectScene = (index: number) => {
    setActiveIndex(index);
    if (cycleRef.current) {
      window.clearInterval(cycleRef.current);
    }
    if (!prefersReducedMotion) {
      cycleRef.current = window.setInterval(() => {
        setActiveIndex((current) => (current + 1) % heroScenes.length);
      }, 6800);
    }
  };

  return (
    <section
      id="landing-hero"
      className="landing-snap-end relative min-h-[100svh] overflow-hidden supports-[height:100dvh]:min-h-[100dvh]"
      style={heroLayout.style}
    >
      <div className="absolute inset-0">
        {heroScenes.map((scene, index) => (
          <HeroVideoLayer
            key={scene.id}
            active={activeIndex === index}
            crop={scene.crop}
            mobilePosterSrc={scene.mobilePosterSrc}
            mobileSrc={scene.mobileVideoSrc}
            posterSrc={scene.posterSrc}
            priority={index === 0}
            src={scene.videoSrc}
          />
        ))}

        {heroScenes.map((scene, index) => (
          <div
            key={`${scene.id}-tone`}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000",
              scene.overlayClass,
              activeIndex === index ? "opacity-100" : "opacity-0"
            )}
          />
        ))}

        <div className="hero-media-vignette absolute inset-0" />
        <div className="hero-media-bloom absolute inset-0" />
        <div className="hero-media-top-fade absolute inset-x-0 top-0 h-44 sm:h-48" />
        <div className="hero-media-bottom-fade absolute inset-x-0 bottom-0 h-64 sm:h-72" />
        <div className="hero-media-bottom-tail absolute inset-x-0 bottom-0 h-24 sm:h-28" />
        <div className="hero-media-left-shadow absolute inset-0 hidden xl:block" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:112px_112px]" />
      </div>

      <div className="relative z-10 mx-auto h-[100svh] w-full max-w-[1440px] px-4 supports-[height:100dvh]:h-[100dvh] sm:px-6 lg:px-8">
        <div
          className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto_auto]"
          style={{
            paddingTop: "var(--hero-top-space)",
            paddingBottom: "max(env(safe-area-inset-bottom), var(--hero-bottom-space))",
          }}
        >
          <div
            className={cn(
              "min-h-0 flex",
              heroLayout.contentAlignClass
            )}
          >
            <div
              className="w-full"
              style={{
                maxWidth: "var(--hero-copy-width)",
                transform: "translate3d(0, var(--hero-copy-shift), 0)",
              }}
            >
              <div
                key={currentScene.id}
                className="animate-in fade-in slide-in-from-bottom-4 duration-700"
              >
                <h1
                  className="font-semibold leading-[0.9] tracking-[-0.08em] text-white [text-shadow:0_6px_34px_rgba(0,0,0,0.28)]"
                  style={{
                    fontSize: "var(--hero-title-size)",
                    maxWidth: "var(--hero-copy-measure)",
                  }}
                >
                  {currentScene.title}
                </h1>

                <p
                  className="mt-3 font-medium text-white/90 [text-shadow:0_2px_24px_rgba(0,0,0,0.22)] sm:mt-4"
                  style={{
                    fontSize: "var(--hero-body-size)",
                    lineHeight: "var(--hero-body-line-height)",
                    maxWidth: "var(--hero-copy-body-width)",
                  }}
                >
                  {currentScene.body}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center py-2 sm:py-4">
            <div
              className={cn(
                "grid w-full max-w-[30rem] items-center justify-center",
                viewportSize.width < 640
                  ? "grid-cols-2"
                  : "grid-cols-[max-content_max-content]"
              )}
              style={{ gap: "var(--hero-cta-gap)" }}
            >
              <Button
                asChild
                className="min-w-0 rounded-full border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(58,217,255,0.24),rgba(255,255,255,0.08))] text-[0.82rem] text-white shadow-[0_20px_55px_rgba(10,118,163,0.34)] hover:bg-[linear-gradient(135deg,rgba(58,217,255,0.3),rgba(255,255,255,0.12))] sm:text-sm"
                style={{
                  height: "var(--hero-cta-height)",
                  paddingInline: "var(--hero-cta-pad-x)",
                }}
              >
                <Link href="/auth/register">
                  Request access
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => scrollToScene("why-ctrl")}
                className="min-w-0 rounded-full border border-white/18 bg-black/24 text-[0.82rem] text-white/94 backdrop-blur-xl hover:bg-white/[0.08] hover:text-white sm:text-sm"
                style={{
                  height: "var(--hero-cta-height)",
                  paddingInline: "var(--hero-cta-pad-x)",
                }}
              >
                Explore the system
              </Button>
            </div>
          </div>

          <div
            className="border-t border-white/8"
            style={{ paddingTop: "var(--hero-controls-pt)" }}
          >
            <div
              ref={pillTrackRef}
              className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {heroScenes.map((scene, index) => {
                const sceneActive = scene.id === currentScene.id;

                return (
                  <button
                    key={scene.id}
                    ref={(element) => {
                      pillRefs.current[index] = element;
                    }}
                    type="button"
                    onClick={() => selectScene(index)}
                    className={cn(
                      "group min-w-fit rounded-full border text-left transition-all duration-300",
                      sceneActive
                        ? "border-white/16 bg-white/[0.08] text-white"
                        : "border-white/8 bg-black/12 text-white/54 hover:bg-white/[0.05] hover:text-white/78"
                    )}
                    style={{
                      padding: "var(--hero-pill-pad-y) var(--hero-pill-pad-x)",
                    }}
                  >
                    <span
                      className="font-semibold uppercase tracking-[0.28em]"
                      style={{ fontSize: "var(--hero-pill-index-size)" }}
                    >
                      {scene.index}
                    </span>
                    <span
                      className="ml-2 font-medium"
                      style={{ fontSize: "var(--hero-pill-text-size)" }}
                    >
                      {scene.kicker}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
