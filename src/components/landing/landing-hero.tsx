"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";

import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/animated-background";

function scrollToScene(id: string) {
  const target = document.getElementById(id);
  const nav = document.querySelector("nav");

  if (!target) return;

  const navHeight = nav instanceof HTMLElement ? nav.getBoundingClientRect().height : 0;
  const extraOffset = window.innerWidth >= 1024 ? 28 : 18;
  const top = target.getBoundingClientRect().top + window.scrollY - navHeight - extraOffset;

  window.scrollTo({
    top: Math.max(0, top),
    behavior: "smooth",
  });

  window.history.replaceState(null, "", `#${id}`);
}

type LandingHeroProps = {
  navHeight?: number;
  bgColor?: string;
  reduceMotion?: boolean;
};

export function LandingHero({ navHeight = 96, bgColor = "bg-black", reduceMotion = false }: LandingHeroProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Extract color for gradient (e.g., from "bg-[#000f24]" to "#000f24")
  const gradientColor = bgColor.startsWith("bg-[")
    ? bgColor.slice(4, -1)
    : bgColor.replace("bg-", "");

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.12, delayChildren: 0.15 },
    },
  };

  const rise: Variants = {
    hidden: { opacity: 0, y: 26, filter: "blur(8px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <section
      id="landing-hero"
      className={`relative min-h-[92svh] lg:min-h-[100svh] overflow-hidden flex flex-col items-center justify-start lg:justify-center pb-20 scroll-mt-24 ${bgColor}`}
    >
      {/* Animated Data Streams Background */}
      <AnimatedBackground disabled={reduceMotion} />

      {/* Reticle grid — echoes the logo's registration marks, very subtle */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.18] dark:opacity-[0.22]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          color: "rgb(148 163 184 / 0.35)",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 42%, black 30%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 42%, black 30%, transparent 78%)",
        }}
      />

      {/* Soft radial spotlight behind the headline */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-[38%] z-0 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(56,189,248,0.16) 0%, rgba(37,99,235,0.08) 38%, transparent 70%)",
        }}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
        animate={reduceMotion ? {} : { opacity: [0.7, 1, 0.7], scale: [0.95, 1.04, 0.95] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Soft bottom fade to seamlessly blend into the next section */}
      <div
        className="absolute bottom-0 inset-x-0 h-48 pointer-events-none z-[1]"
        style={{ background: `linear-gradient(to top, ${gradientColor.startsWith('#') ? gradientColor : (gradientColor === 'black' ? 'black' : 'var(--tw-gradient-from)')}, transparent)` }}
      />

      <div
        className="relative z-10 mx-auto w-full max-w-[1440px] px-6 max-lg:pt-[calc(var(--landing-nav-clearance)+1.5rem)] lg:pt-[var(--landing-nav-clearance)]"
        style={{ "--landing-nav-clearance": `${navHeight}px` } as React.CSSProperties}
      >
        <motion.div
          variants={container}
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "show"}
          className="flex flex-col items-center text-center max-w-[58rem] mx-auto gap-7"
        >
          {/* Main Headline */}
          <motion.h1
            variants={rise}
            className="text-[2.75rem] leading-[1.05] sm:text-6xl lg:text-[4.75rem] lg:leading-[1.04] font-medium tracking-tight text-slate-900 dark:text-white font-display text-balance"
          >
            Hiring the right people starts with the{" "}
            <span className="relative whitespace-nowrap">
              <span className="bg-gradient-to-r from-sky-500 to-blue-600 dark:from-sky-300 dark:to-blue-400 bg-clip-text text-transparent">
                right intelligence
              </span>
            </span>
          </motion.h1>



          {/* Call to Action Buttons */}
          <motion.div
            variants={rise}
            className="mt-2 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
          >
            <Button
              asChild
              className="group h-12 md:h-14 rounded-full bg-slate-900 dark:bg-white px-8 text-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors text-sm md:text-base font-medium w-full sm:w-auto focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-white/50"
            >
              <Link href="/auth/register?mode=register" className="flex items-center justify-center">
                Get Started
                <ArrowRight className="h-4 w-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => scrollToScene("capabilities")}
              className="h-12 md:h-14 rounded-full border border-slate-200 dark:border-white/10 bg-transparent px-8 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors text-sm md:text-base font-medium w-full sm:w-auto focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-white/20"
            >
              Explore Platform
            </Button>
          </motion.div>

          {/* Trust strip — quiet proof points instead of a noisy widget */}
          <motion.div
            variants={rise}
            className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[11px] font-mono uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500"
          >
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-sky-500/70" />
              Behavioural scoring
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-sky-500/70" />
              Pressure-tested scenarios
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-sky-500/70" />
              Three role-built portals
            </span>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Down Indicator */}
      <motion.button
        onClick={() => scrollToScene("capabilities")}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={reduceMotion ? {} : { opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.1, ease: "easeOut" }}
        aria-label="Scroll down"
      >
        <motion.div
          animate={reduceMotion ? {} : { y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <ChevronDown className="h-8 w-8" />
        </motion.div>
      </motion.button>
    </section>
  );
}
