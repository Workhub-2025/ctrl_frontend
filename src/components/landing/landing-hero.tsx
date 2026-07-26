"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, KeyRound } from "lucide-react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

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
  reduceMotion?: boolean;
};

export function LandingHero({
  navHeight = 96,
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
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <section
      id="landing-hero"
      className="relative min-h-[100svh] overflow-hidden bg-background"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-gradient-hero opacity-90"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
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
          className="grid w-full items-end gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.65fr)] lg:gap-16"
        >
          <div className="min-w-0 max-w-[48rem]">
            <motion.div variants={rise} className="mb-8">
              <BrandLogo
                layout="stacked"
                className="h-16 w-[20rem] sm:h-[4.5rem] sm:w-[22rem] lg:h-20 lg:w-[26rem]"
              />
            </motion.div>

            <motion.h1
              variants={rise}
              className="text-balance font-display text-[2.75rem] font-medium leading-[1.02] tracking-[-0.04em] text-foreground sm:text-5xl lg:text-[4rem]"
            >
              Hiring made clearer.
              <span className="mt-2 block text-muted-foreground">
                Evidence over guesswork.
              </span>
            </motion.h1>

            <motion.p
              variants={rise}
              className="mt-6 max-w-[36rem] text-lg leading-8 text-muted-foreground sm:text-xl"
            >
              CTRL helps hiring teams run structured assessments and review
              results with confidence — so you hire for how people perform, not
              how they interview.
            </motion.p>

            <motion.div
              variants={rise}
              className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Button
                type="button"
                onClick={() => scrollToScene("how")}
                className="group h-12 w-full rounded-md px-7 text-sm font-semibold sm:w-auto"
              >
                See how it works
                <ArrowDown
                  className="ml-2 h-4 w-4 transition-transform group-hover:translate-y-0.5"
                  aria-hidden="true"
                />
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 w-full rounded-md px-7 text-sm font-semibold sm:w-auto"
              >
                <Link href="/join" className="flex items-center justify-center gap-2">
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  Enter session code
                </Link>
              </Button>
            </motion.div>
          </div>

          <motion.aside
            variants={rise}
            aria-label="Candidate session entry"
            className="relative overflow-hidden rounded-lg border border-border bg-card p-6 shadow-sm sm:p-7"
          >
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              Candidates
            </p>
            <h2 className="mt-3 font-display text-xl font-medium tracking-tight text-foreground">
              Have a one-time code?
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Enter your session code on the join page to open your assessment.
            </p>
            <Link
              href="/join"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
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
