"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ListChecks,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";

import { Button } from "@/components/ui/button";
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

const platformFlowRows = [
  { label: "Campaign setup", detail: "A clear starting point for delivery", icon: ListChecks },
  { label: "Managed delivery", detail: "A consistent participant journey", icon: ClipboardCheck },
  { label: "Structured review", detail: "Clear evidence for your team", icon: Scale },
];

export function LandingHero({ navHeight = 96, bgColor = "bg-black", reduceMotion = false }: LandingHeroProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
  };

  const rise: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <section
      id="landing-hero"
      className={"relative min-h-[760px] overflow-hidden " + bgColor}
    >
      <AnimatedBackground disabled={reduceMotion} />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.14] dark:opacity-[0.2]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          color: "rgb(148 163 184 / 0.35)",
          maskImage: "linear-gradient(to bottom, black 10%, black 68%, transparent 95%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 10%, black 68%, transparent 95%)",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[44rem]"
        style={{
          background:
            "radial-gradient(circle at 23% 40%, rgba(56,189,248,0.13), transparent 34%), radial-gradient(circle at 78% 46%, rgba(37,99,235,0.1), transparent 30%)",
        }}
      />

      <div
        className="relative z-10 mx-auto flex min-h-[760px] w-full max-w-[1440px] items-center px-6 pb-16 max-lg:pt-[calc(var(--landing-nav-clearance)+2.25rem)] lg:px-10 lg:pb-20 lg:pt-[calc(var(--landing-nav-clearance)+2rem)]"
        style={{ "--landing-nav-clearance": String(navHeight) + "px" } as React.CSSProperties}
      >
        <motion.div
          variants={container}
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "show"}
          className="grid w-full items-center gap-14 lg:grid-cols-[minmax(0,1.08fr)_minmax(23rem,0.72fr)] lg:gap-16 xl:gap-24"
        >
          <div className="min-w-0 max-w-[49rem]">
            <motion.div
              variants={rise}
              className="mb-6 flex items-center gap-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-400"
            >
              <span className="h-px w-8 bg-sky-500/70" aria-hidden="true" />
              Assessment platform for organisations
            </motion.div>

            <motion.h1
              variants={rise}
              className="text-balance font-display text-[3rem] font-medium leading-[1.02] tracking-[-0.035em] text-slate-900 sm:text-6xl lg:text-[4.6rem] dark:text-white"
            >
              A clearer way to understand{" "}
              <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent dark:from-sky-300 dark:to-blue-400">
                capability.
              </span>
            </motion.h1>

            <motion.p
              variants={rise}
              className="mt-7 max-w-[42rem] text-lg leading-8 text-slate-600 sm:text-xl dark:text-slate-300"
            >
              CTRL helps organisations run structured assessments and review
              consistent evidence across one connected platform.
            </motion.p>

            <motion.div variants={rise} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={() => scrollToScene("capabilities")}
                className="group h-12 w-full rounded-md bg-slate-900 px-7 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-400 sm:w-auto md:h-13 md:text-base dark:bg-white dark:text-black dark:hover:bg-slate-200 dark:focus-visible:ring-white/50"
              >
                Explore the platform
                <ArrowDown className="ml-2 h-4 w-4 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
              </Button>
              <Button
                asChild
                variant="ghost"
                className="group h-12 w-full rounded-md border border-slate-300 bg-white/60 px-7 text-sm font-semibold text-slate-800 hover:bg-white focus-visible:ring-2 focus-visible:ring-slate-400 sm:w-auto md:h-13 md:text-base dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/[0.06] dark:hover:text-white dark:focus-visible:ring-white/20"
              >
                <Link href="#contracts" onClick={(event) => { event.preventDefault(); scrollToScene("contracts"); }}>
                  View contracts
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </Button>
            </motion.div>

            <motion.ul
              variants={rise}
              className="mt-9 flex flex-wrap gap-x-7 gap-y-3 border-t border-slate-200/80 pt-6 text-xs font-medium text-slate-500 dark:border-white/10 dark:text-slate-400"
            >
              {["Connected process", "Consistent delivery", "Human-led decisions"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </motion.ul>
          </div>

          <motion.aside
            variants={rise}
            aria-label="Example CTRL workspace"
            className="relative min-w-0 overflow-hidden border border-slate-300 bg-[#f8fafc] shadow-[0_24px_70px_-36px_rgba(15,23,42,0.35)] dark:border-white/12 dark:bg-[#080b10] dark:shadow-[0_24px_80px_-30px_rgba(0,0,0,0.75)]"
          >
            <span aria-hidden className="absolute -left-px -top-px h-5 w-5 border-l-2 border-t-2 border-sky-500" />
            <span aria-hidden className="absolute -bottom-px -right-px h-5 w-5 border-b-2 border-r-2 border-sky-500" />

            <div className="flex items-start justify-between gap-6 border-b border-slate-200 px-6 py-5 dark:border-white/10">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-400">
                  Workspace preview
                </p>
                <h2 className="mt-2 font-display text-2xl font-medium text-slate-900 dark:text-white">
                  Assessment campaign
                </h2>
              </div>
              <span className="inline-flex shrink-0 items-center gap-2 border border-emerald-500/25 bg-emerald-500/[0.08] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Ready
              </span>
            </div>

            <div className="grid grid-cols-2 border-b border-slate-200 dark:border-white/10">
              <div className="border-r border-slate-200 px-6 py-4 dark:border-white/10">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">Delivery</p>
                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">Flexible</p>
              </div>
              <div className="px-6 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">Evidence</p>
                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">Reviewable</p>
              </div>
            </div>

            <div className="px-6 py-5">
              <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Platform flow
              </p>
              <div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-white/10 dark:border-white/10">
                {platformFlowRows.map((flow, index) => (
                  <div key={flow.label} className="flex items-center gap-4 py-3.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                      <flow.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{flow.label}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{flow.detail}</p>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">0{index + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-100 px-6 py-4 text-xs leading-5 text-slate-600 dark:bg-white/[0.035] dark:text-slate-400">
              <ClipboardCheck className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              Designed to support consistent, considered hiring decisions.
            </div>
          </motion.aside>
        </motion.div>
      </div>
    </section>
  );
}
