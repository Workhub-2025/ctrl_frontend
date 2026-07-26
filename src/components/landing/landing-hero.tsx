"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  KeyRound,
} from "lucide-react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { AnimatedBackground } from "@/components/ui/animated-background";

function scrollToScene(id: string) {
  const target = document.getElementById(id);
  const nav = document.querySelector("nav");

  if (!target) return;

  const navHeight = nav instanceof HTMLElement ? nav.getBoundingClientRect().height : 0;
  const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 24;

  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  window.history.replaceState(null, "", "#" + id);
}

type LandingHeroProps = {
  navHeight?: number;
  bgColor?: string;
  reduceMotion?: boolean;
};

export function LandingHero({
  navHeight = 96,
  bgColor = "bg-black",
  reduceMotion = false,
}: LandingHeroProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
  };

  const rise: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <section
      id="landing-hero"
      className={"relative min-h-[100svh] overflow-hidden " + bgColor}
    >
      <AnimatedBackground disabled={reduceMotion} />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 18% 35%, rgba(245,158,11,0.16), transparent 55%), radial-gradient(ellipse 40% 35% at 82% 28%, rgba(14,165,233,0.1), transparent 50%), linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.18] dark:opacity-[0.28]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          color: "rgb(168 162 158 / 0.35)",
          maskImage: "linear-gradient(to bottom, black 8%, black 70%, transparent 96%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 8%, black 70%, transparent 96%)",
        }}
      />

      <div
        className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1440px] flex-col justify-center px-6 pb-20 max-lg:pt-[calc(var(--landing-nav-clearance)+2.5rem)] lg:px-10 lg:pb-24 lg:pt-[calc(var(--landing-nav-clearance)+1.5rem)]"
        style={{ "--landing-nav-clearance": String(navHeight) + "px" } as React.CSSProperties}
      >
        <motion.div
          variants={container}
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "show"}
          className="grid w-full items-end gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.7fr)] lg:gap-16"
        >
          <div className="min-w-0 max-w-[52rem]">
            <motion.div variants={rise} className="mb-8">
              <BrandLogo
                layout="stacked"
                className="h-16 w-[20rem] sm:h-[4.5rem] sm:w-[22rem] lg:h-20 lg:w-[26rem]"
              />
            </motion.div>

            <motion.h1
              variants={rise}
              className="text-balance font-display text-[2.75rem] font-medium leading-[1.02] tracking-[-0.04em] text-stone-950 sm:text-5xl lg:text-[4.25rem] dark:text-white"
            >
              Hiring the right people
              <span className="block text-stone-500 dark:text-stone-400">
                starts with the right intelligence.
              </span>
            </motion.h1>

            <motion.p
              variants={rise}
              className="mt-6 max-w-[38rem] text-lg leading-8 text-stone-600 sm:text-xl dark:text-stone-300"
            >
              CTRL reveals how candidates think, respond and perform under
              pressure, so you can recruit with confidence and build stronger
              operational teams.
            </motion.p>

            <motion.div
              variants={rise}
              className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Button
                asChild
                className="group h-12 w-full rounded-md bg-stone-950 px-7 text-sm font-semibold text-white hover:bg-stone-800 focus-visible:ring-2 focus-visible:ring-amber-500/50 sm:w-auto dark:bg-amber-400 dark:text-stone-950 dark:hover:bg-amber-300"
              >
                <Link href="/join" className="flex items-center justify-center gap-2">
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  Enter session code
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => scrollToScene("capabilities")}
                className="group h-12 w-full rounded-md border border-stone-300 bg-white/50 px-7 text-sm font-semibold text-stone-800 hover:bg-white focus-visible:ring-2 focus-visible:ring-stone-400 sm:w-auto dark:border-white/15 dark:bg-transparent dark:text-stone-200 dark:hover:bg-white/[0.06]"
              >
                Explore the platform
                <ArrowDown
                  className="ml-2 h-4 w-4 transition-transform group-hover:translate-y-0.5"
                  aria-hidden="true"
                />
              </Button>
            </motion.div>
          </div>

          <motion.aside
            variants={rise}
            aria-label="Candidate session entry"
            className="relative overflow-hidden border border-stone-300/90 bg-[#f4f0ea]/80 p-6 shadow-[0_28px_80px_-40px_rgba(28,25,23,0.45)] backdrop-blur-sm dark:border-white/12 dark:bg-[#0c0a09]/85 dark:shadow-[0_28px_80px_-30px_rgba(0,0,0,0.8)] sm:p-7"
          >
            <span
              aria-hidden
              className="absolute -left-px -top-px h-5 w-5 border-l-2 border-t-2 border-amber-600 dark:border-amber-400"
            />
            <span
              aria-hidden
              className="absolute -bottom-px -right-px h-5 w-5 border-b-2 border-r-2 border-amber-600 dark:border-amber-400"
            />

            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800 dark:text-amber-400">
              Candidates
            </p>
            <h2 className="mt-3 font-display text-2xl font-medium tracking-tight text-stone-950 dark:text-white">
              Have a one-time code?
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-400">
              Session access codes live on the join page — enter yours there,
              sign in, and open the assessment linked to that session.
            </p>
            <Link
              href="/join"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-stone-950 underline-offset-4 hover:underline dark:text-amber-300"
            >
              Go to join
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </motion.aside>
        </motion.div>
      </div>
    </section>
  );
}
