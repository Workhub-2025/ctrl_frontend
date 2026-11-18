"use client";

import { ArrowDown, ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

function scrollToScene(id: string, reduceMotion: boolean) {
  const target = document.getElementById(id);
  const nav = document.querySelector("nav");

  if (!target) return;

  const navHeight = nav instanceof HTMLElement ? nav.getBoundingClientRect().height : 0;
  const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 24;

  window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" });
  window.history.replaceState(null, "", "#" + id);
}

type LandingHeroProps = {
  navHeight?: number;
  reduceMotion?: boolean;
};

/**
 * Rendered on the server and static: the headline is the page's largest
 * content, so it must paint without waiting for JavaScript.
 */
export function LandingHero({
  navHeight = 96,
  reduceMotion = false,
}: LandingHeroProps) {
  return (
    <section id="landing-hero" className="relative bg-background">
      <div
        className="mx-auto grid min-h-[100dvh] w-full max-w-[1440px] items-center gap-12 px-6 pb-20 pt-[calc(var(--landing-nav-clearance)+2.5rem)] lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.65fr)] lg:gap-16 lg:px-10 lg:pb-24 lg:pt-[calc(var(--landing-nav-clearance)+1.5rem)]"
        style={{ "--landing-nav-clearance": String(navHeight) + "px" } as React.CSSProperties}
      >
        <div className="min-w-0 max-w-[48rem]">
          <BrandLogo
            layout="stacked"
            className="mb-8 h-16 w-[20rem] sm:h-[4.5rem] sm:w-[22rem] lg:h-20 lg:w-[26rem]"
          />

          <h1 className="text-balance font-display text-[2.75rem] font-medium leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl lg:text-[4rem]">
            Hiring made clearer.
            <span className="mt-2 block text-muted-foreground">
              Evidence over guesswork.
            </span>
          </h1>

          <p className="mt-6 max-w-[36rem] text-lg leading-8 text-muted-foreground sm:text-xl">
            CTRL helps hiring teams run structured assessments and review
            results with confidence, so you hire for how people perform, not
            how they interview.
          </p>

          <Button
            type="button"
            onClick={() => scrollToScene("how", reduceMotion)}
            className="group mt-9 h-12 w-full rounded-md px-7 text-sm font-semibold sm:w-auto"
          >
            See how it works
            <ArrowDown
              className="ml-2 h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-y-0.5"
              aria-hidden="true"
            />
          </Button>
        </div>

        <aside
          aria-label="Candidate session entry"
          className="rounded-lg border border-border bg-card p-6 sm:p-7"
        >
          <p className="text-sm font-semibold text-primary">Candidates</p>
          <h2 className="mt-2 font-display text-xl font-medium tracking-tight text-foreground">
            Have a one-time code?
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Enter your session code on the join page to open your assessment.
          </p>
          <Button asChild variant="outline" className="mt-6 h-11 w-full rounded-md sm:w-auto">
            <Link href="/join" className="inline-flex items-center justify-center gap-2">
              Enter session code
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </aside>
      </div>
    </section>
  );
}
