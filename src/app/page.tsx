"use client";

import { LandingHero } from "@/components/landing/landing-hero";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Menu,
  Scale,
  Target,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AccessibilityDropdown } from "@/components/accessibility/accessibility-dropdown";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import {
  MotionPrefs,
  Reveal,
  RevealGroup,
  RevealItem,
} from "@/components/landing/scroll-effects";
import { UK_LEGAL_FOOTER_LINKS } from "@/lib/legal/uk-compliance";

const navItems = [
  { label: "How it works", href: "#how" },
  { label: "Contracts", href: "#contracts" },
  { label: "Join", href: "/join" },
];

const hiringPoints = [
  {
    title: "Set the standard once",
    text: "Define the skills and behaviours that matter for the role, then assess every candidate against the same bar.",
    icon: ClipboardList,
  },
  {
    title: "See performance, not polish",
    text: "Structured exercises surface how people think and decide under pressure — beyond interview confidence.",
    icon: Target,
  },
  {
    title: "Decide with shared evidence",
    text: "Hiring managers review clear results together, so decisions stay consistent and defensible.",
    icon: Scale,
  },
] as const;

type ContractOption = {
  tier: "essential" | "professional" | "founder";
  label: string;
  includedSeats: number;
  deliveryModes: string[];
  includesCoreAssessments: boolean;
  discountPercent?: number;
};

type ContractOptionsData = {
  founderAvailable: boolean;
  founderOfferExpiresAt: string | null;
  options: ContractOption[];
};

const fallbackContractOptions: ContractOptionsData = {
  founderAvailable: true,
  founderOfferExpiresAt: null,
  options: [
    {
      tier: "essential",
      label: "Essential",
      includedSeats: 1,
      deliveryModes: ["in_person"],
      includesCoreAssessments: true,
    },
    {
      tier: "professional",
      label: "Professional",
      includedSeats: 3,
      deliveryModes: ["in_person", "remote", "hybrid"],
      includesCoreAssessments: true,
    },
    {
      tier: "founder",
      label: "Founder",
      includedSeats: 3,
      deliveryModes: ["in_person", "remote", "hybrid"],
      includesCoreAssessments: true,
      discountPercent: 33,
    },
  ],
};

const contractDetails: Record<
  ContractOption["tier"],
  { summary: string; badge: string; footnote: string }
> = {
  essential: {
    summary: "For smaller teams running secure in-person assessment sessions.",
    badge: "Starter",
    footnote: "In-person delivery only",
  },
  professional: {
    summary: "For teams that need flexible delivery across sites and remote sessions.",
    badge: "Teams",
    footnote: "In-person, remote and hybrid",
  },
  founder: {
    summary: "Professional access with Founder pricing on upgrades and add-ons.",
    badge: "Limited",
    footnote: "Founder window pricing",
  },
};

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navHeight, setNavHeight] = useState(96);
  const [contractData, setContractData] = useState<ContractOptionsData>(fallbackContractOptions);
  const navRef = useRef<HTMLElement>(null);
  const { settings, updateSettings, resetSettings, reduceMotion } = useAccessibilitySettings();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const update = () => setNavHeight(nav.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/contract-options")
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as ContractOptionsData;
        if (!cancelled && Array.isArray(payload.options) && payload.options.length > 0) {
          setContractData(payload);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <MotionPrefs reduce={reduceMotion}>
      <div className={cn("ctrl-landing-page relative min-h-screen bg-background text-foreground")}>
        <div className="fixed right-4 top-4 z-[60] sm:right-6 sm:top-5">
          <AccessibilityDropdown
            settings={settings}
            updateSettings={updateSettings}
            resetSettings={resetSettings}
            description="Theme, text size, and reading preferences for this device."
          />
        </div>

        <nav
          ref={navRef}
          className={cn(
            "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
            scrolled
              ? "border-border bg-background/95 backdrop-blur-md"
              : "border-transparent bg-transparent",
          )}
        >
          <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-6 lg:h-[4.5rem] lg:px-10">
            <Link href="/" className="shrink-0" aria-label="CTRL home">
              <BrandLogo className="h-8 w-auto sm:h-9" />
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
              <Button asChild size="sm" className="ml-2 h-9 px-4">
                <Link href="/auth/login">Login</Link>
              </Button>
            </div>

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-foreground md:hidden"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>

          <AnimatePresence>
            {mobileMenuOpen ? (
              <motion.div
                initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-border bg-background md:hidden"
              >
                <div className="flex flex-col gap-1 px-6 py-4">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-md px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Button asChild className="mt-2">
                    <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                      Login
                    </Link>
                  </Button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </nav>

        <main>
          <LandingHero navHeight={navHeight} reduceMotion={reduceMotion} />

          <section id="how" className="border-t border-border bg-background">
            <div className="mx-auto max-w-[1440px] px-6 py-20 lg:px-10 lg:py-28">
              <Reveal variant="fade-up" className="mx-auto max-w-2xl text-center">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                  How hiring gets easier
                </p>
                <h2 className="mt-4 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                  A clearer path from role to decision
                </h2>
                <p className="mt-4 text-base leading-7 text-muted-foreground">
                  CTRL keeps assessment delivery simple for hiring teams — one shared process,
                  structured evidence, and less noise in the room.
                </p>
              </Reveal>

              <RevealGroup stagger={0.1} className="mt-14 grid gap-4 md:grid-cols-3">
                {hiringPoints.map((point, index) => (
                  <RevealItem key={point.title} variant="fade-up">
                    <article className="flex h-full flex-col rounded-lg border border-border bg-card p-6 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted text-primary">
                          <point.icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <h3 className="mt-6 font-display text-xl font-medium text-foreground">
                        {point.title}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{point.text}</p>
                    </article>
                  </RevealItem>
                ))}
              </RevealGroup>
            </div>
          </section>

          <section id="contracts" className="border-t border-border bg-muted/30">
            <div className="mx-auto max-w-[1440px] px-6 py-20 lg:px-10 lg:py-28">
              <Reveal variant="fade-up" className="mx-auto mb-14 max-w-2xl text-center">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                  Contracts
                </p>
                <h2 className="mt-4 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                  Options for hiring teams
                </h2>
                <p className="mt-4 text-base leading-7 text-muted-foreground">
                  Choose the seats and delivery modes your organisation needs. Every option includes
                  CTRL&apos;s core released assessments.
                </p>
              </Reveal>

              <RevealGroup stagger={0.1} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {contractData.options.map((option) => {
                  const details = contractDetails[option.tier];
                  const features = [
                    `${option.includedSeats} hiring manager ${option.includedSeats === 1 ? "seat" : "seats"}`,
                    "All core released and future assessments",
                    option.tier === "essential"
                      ? "In-person delivery only"
                      : "In-person, remote and hybrid delivery",
                    option.tier === "founder" && option.discountPercent
                      ? `${option.discountPercent}% discount on upgrades and add-on assessments`
                      : null,
                  ].filter((feature): feature is string => Boolean(feature));

                  return (
                    <RevealItem key={option.tier} variant="fade-up" className="h-full">
                      <article className="flex h-full flex-col rounded-lg border border-border bg-card p-6 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                              {details.badge}
                            </span>
                            <h3 className="mt-3 font-display text-2xl font-medium tracking-tight text-foreground">
                              {option.label}
                            </h3>
                          </div>
                          <span className="mt-1 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                        </div>
                        <p className="mt-4 text-sm leading-6 text-muted-foreground">{details.summary}</p>
                        <ul className="mt-6 space-y-3">
                          {features.map((feature) => (
                            <li
                              key={feature}
                              className="flex gap-3 text-sm leading-5 text-foreground"
                            >
                              <CheckCircle2
                                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                                aria-hidden="true"
                              />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-auto pt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          {details.footnote}
                        </p>
                      </article>
                    </RevealItem>
                  );
                })}
              </RevealGroup>

              {contractData.founderOfferExpiresAt ? (
                <Reveal variant="fade-up">
                  <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-6 text-muted-foreground">
                    Founder availability is currently listed until{" "}
                    {new Date(contractData.founderOfferExpiresAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    .
                  </p>
                </Reveal>
              ) : null}
            </div>
          </section>

          <section id="contact" className="border-t border-border bg-background">
            <div className="mx-auto max-w-3xl px-6 py-24 text-center lg:py-32">
              <Reveal variant="fade-up">
                <h2 className="font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
                  Ready when your team is
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                  Start with the contract that fits your hiring process, or join a session if you
                  already have a code.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button asChild className="h-11 px-6">
                    <Link href="#contracts" className="inline-flex items-center gap-2">
                      View contracts
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 px-6">
                    <Link href="/auth/login">Login</Link>
                  </Button>
                </div>
              </Reveal>
            </div>
          </section>
        </main>

        <footer className="border-t border-border bg-muted/20">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-6 py-12 lg:flex-row lg:items-start lg:justify-between lg:px-10">
            <div className="max-w-sm">
              <BrandLogo className="h-8 w-auto" />
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Structured assessment delivery and review for organisational hiring teams.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Explore
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>
                    <Link href="#how" className="text-foreground hover:text-primary">
                      How it works
                    </Link>
                  </li>
                  <li>
                    <Link href="#contracts" className="text-foreground hover:text-primary">
                      Contracts
                    </Link>
                  </li>
                  <li>
                    <Link href="/join" className="text-foreground hover:text-primary">
                      Join
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Legal
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {UK_LEGAL_FOOTER_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-foreground hover:text-primary">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Access
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>
                    <Link href="/auth/login" className="text-foreground hover:text-primary">
                      Login
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground lg:px-10">
            © {new Date().getFullYear()} CTRL Assessment
          </div>
        </footer>
      </div>
    </MotionPrefs>
  );
}
