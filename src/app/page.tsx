"use client";

import { LandingHero } from "@/components/landing/landing-hero";
import { BrandLogo, CtrlText } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Activity,
  Menu,
  Crosshair,
  X,
  CheckCircle2,
  Network,
  ListChecks,
  Scale,
  KeyRound,
  CalendarClock,
  Trophy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import {
  WorkflowVisual,
  type WorkflowVisualVariant,
} from "@/components/landing/workflow-visuals";
import { UK_LEGAL_FOOTER_LINKS } from "@/lib/legal/uk-compliance";

const navItems = [
  { label: "Platform", href: "#capabilities" },
  { label: "How it works", href: "#workflow" },
  { label: "Contracts", href: "#contracts" },
  { label: "Join", href: "/join" },
];

const platformPillars: { label: string; icon: typeof Activity; tint: DisciplineTint }[] = [
  { label: "Clear campaign setup", icon: ListChecks, tint: "rose" },
  { label: "Managed delivery", icon: Activity, tint: "amber" },
  { label: "Clear participant journeys", icon: Network, tint: "cyan" },
  { label: "Structured review", icon: Scale, tint: "violet" },
];

type DisciplineTint = "rose" | "amber" | "cyan" | "violet";

const disciplineTintStyles: Record<DisciplineTint, { icon: string; ring: string }> = {
  rose: {
    icon: "group-hover:text-rose-500 dark:group-hover:text-rose-400",
    ring: "group-hover:border-rose-300/80 dark:group-hover:border-rose-500/40",
  },
  amber: {
    icon: "group-hover:text-amber-500 dark:group-hover:text-amber-400",
    ring: "group-hover:border-amber-300/80 dark:group-hover:border-amber-500/40",
  },
  cyan: {
    icon: "group-hover:text-cyan-600 dark:group-hover:text-cyan-400",
    ring: "group-hover:border-cyan-300/80 dark:group-hover:border-cyan-500/40",
  },
  violet: {
    icon: "group-hover:text-violet-500 dark:group-hover:text-violet-400",
    ring: "group-hover:border-violet-300/80 dark:group-hover:border-violet-500/40",
  },
};

const hiringWorkflowSteps: {
  step: string;
  title: string;
  text: string;
  icon: typeof Crosshair;
  visual: WorkflowVisualVariant;
}[] = [
  {
    step: "01",
    title: "Prepare the Assessment",
    text: "Set up the campaign, confirm delivery details and bring everything together in one place.",
    icon: ListChecks,
    visual: "campaign",
  },
  {
    step: "02",
    title: "Invite Participants",
    text: "Manage invitations, scheduling and delivery details from a single workspace.",
    icon: CalendarClock,
    visual: "sessions",
  },
  {
    step: "03",
    title: "Deliver Consistently",
    text: "Give every participant a clear, guided experience while your team retains oversight of delivery.",
    icon: Activity,
    visual: "tracking",
  },
  {
    step: "04",
    title: "Review the Evidence",
    text: "Bring assessment outcomes into one reviewable view to support a considered, human-led decision.",
    icon: Trophy,
    visual: "ranking",
  },
];

const candidateWorkflowSteps: {
  step: string;
  title: string;
  text: string;
  icon: typeof Crosshair;
  visual: WorkflowVisualVariant;
}[] = [
  {
    step: "01",
    title: "Receive Your Invitation",
    text: "Use your secure invitation to access the correct organisation and assessment.",
    icon: KeyRound,
    visual: "access",
  },
  {
    step: "02",
    title: "Check the Details",
    text: "Review the timing, delivery information and requirements before your assessment begins.",
    icon: CalendarClock,
    visual: "schedule",
  },
  {
    step: "03",
    title: "Complete the Assessment",
    text: "Follow a focused, guided experience with clear instructions at each stage.",
    icon: ListChecks,
    visual: "modules",
  },
  {
    step: "04",
    title: "Await the Outcome",
    text: "Your assessment is shared securely with the organisation, who will contact you about next steps.",
    icon: CheckCircle2,
    visual: "outcome",
  },
];

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
  { accent: Accent; summary: string; badge: string; footnote: string }
> = {
  essential: {
    accent: "cyan",
    summary: "For smaller teams running secure in-person assessment sessions.",
    badge: "Starter",
    footnote: "In-person delivery only",
  },
  professional: {
    accent: "blue",
    summary: "For active hiring teams that need three manager seats from day one.",
    badge: "Standard",
    footnote: "In-person, remote and hybrid delivery",
  },
  founder: {
    accent: "emerald",
    summary: "Launch-window contract with wider delivery modes and a permanent founder upgrade discount.",
    badge: "Launch only",
    footnote: "Founder tier remains active",
  },
};

type Accent = "cyan" | "blue" | "violet" | "emerald";

const accentStyles: Record<Accent, { text: string; dot: string; gradient: string }> = {
  cyan: {
    text: "text-cyan-600 dark:text-cyan-400",
    dot: "bg-cyan-500",
    gradient: "from-cyan-500 to-blue-600 dark:from-cyan-300 dark:to-blue-400",
  },
  blue: {
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
    gradient: "from-blue-500 to-indigo-600 dark:from-blue-300 dark:to-indigo-400",
  },
  violet: {
    text: "text-violet-600 dark:text-violet-400",
    dot: "bg-violet-500",
    gradient: "from-violet-500 to-fuchsia-600 dark:from-violet-300 dark:to-fuchsia-400",
  },
  emerald: {
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    gradient: "from-emerald-500 to-cyan-600 dark:from-emerald-300 dark:to-cyan-400",
  },
};

function GradientText({ accent, children }: { accent: Accent; children: React.ReactNode }) {
  return (
    <span className={cn("bg-gradient-to-r bg-clip-text text-transparent", accentStyles[accent].gradient)}>
      {children}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  centered = false,
  accent = "cyan",
}: {
  eyebrow: string;
  title: React.ReactNode;
  body?: React.ReactNode;
  centered?: boolean;
  accent?: Accent;
}) {
  const a = accentStyles[accent];
  return (
    <Reveal variant="blur">
      <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
        <div
          className={cn(
            "flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.2em] font-mono",
            a.text,
            centered && "justify-center"
          )}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", a.dot)} />
            <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", a.dot)} />
          </span>
          {eyebrow}
        </div>
        <h2 className="mt-4 text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight text-slate-900 dark:text-white text-balance font-display">
          {title}
        </h2>
        {body && (
          <p className={cn("mt-6 text-lg leading-relaxed text-slate-600 dark:text-slate-400 font-light", centered && "mx-auto")}>
            {body}
          </p>
        )}
      </div>
    </Reveal>
  );
}

function scrollToAnchor(id: string) {
  const target = document.getElementById(id);
  const nav = document.querySelector("nav");

  if (!target) return;

  const navHeight = nav instanceof HTMLElement ? nav.getBoundingClientRect().height : 0;
  const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 24;

  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  window.history.replaceState(null, "", `#${id}`);
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
  window.history.replaceState(null, "", window.location.pathname);
}

export default function Home() {
  const navRef = useRef<HTMLElement | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [navHeight, setNavHeight] = useState(96);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const [workflowAudience, setWorkflowAudience] = useState<"hiring" | "candidate">("hiring");
  const [contractData, setContractData] = useState<ContractOptionsData>(fallbackContractOptions);
  const {
    settings: accessibilitySettings,
    updateSettings: updateAccessibilitySettings,
    resetSettings: resetAccessibilitySettings,
    reduceMotion,
    themeClassName: bgColor,
  } = useAccessibilitySettings();

  useEffect(() => {
    let cancelled = false;

    fetch("/api/public/contract-options", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Contract options unavailable"))))
      .then((body) => {
        if (!cancelled && body?.data?.options?.length) {
          setContractData(body.data as ContractOptionsData);
        }
      })
      .catch(() => {
        if (!cancelled) setContractData(fallbackContractOptions);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const updateNavHeight = () => {
      const { bottom } = nav.getBoundingClientRect();
      setNavHeight(Math.ceil(bottom));
    };
    updateNavHeight();
    const observer = new ResizeObserver(updateNavHeight);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
      if (isMobileMenuOpen && window.scrollY > 48) setIsMobileMenuOpen(false);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.href.slice(1)))
      .filter((el): el is HTMLElement => el !== null);
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <div className={cn(bgColor, "ctrl-landing-page min-h-screen overflow-x-clip font-sans selection:bg-white/20 transition-colors duration-500")}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-full focus:font-bold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary">
        Skip to content
      </a>
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-slate-950/35 dark:bg-black/70 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          />
        )}
      </AnimatePresence>

      <motion.nav
        ref={navRef}
        initial={reduceMotion ? false : { y: -24, opacity: 0 }}
        animate={reduceMotion ? {} : { y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-4 inset-x-0 mx-auto w-full max-w-[1200px] px-4 sm:px-6 z-50 transition-[max-width,padding,top] duration-500"
      >
        <div className={cn(
          "flex items-center justify-between rounded-full border transition-[background-color,border-color,padding,box-shadow] duration-500 px-6",
          scrolled
            ? "bg-white dark:bg-[#0a0a0a] border-slate-200 dark:border-white/10 py-3 shadow-md dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
            : "bg-transparent border-transparent py-4"
        )}>
          {/* Logo */}
          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setIsMobileMenuOpen(false);
              scrollToTop();
            }}
            aria-label="CTRL — back to top"
            className="flex items-center group relative z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-white/20"
          >
            <BrandLogo className="h-10 w-[4.5rem] sm:h-12 sm:w-[5.35rem] transition-transform duration-300 group-hover:scale-[1.04] group-hover:opacity-90" />
          </Link>

          {/* Links (Desktop) */}
          <div className="hidden lg:flex items-center gap-8 text-sm font-medium absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => {
              const isHash = item.href.startsWith("#");
              const isActive = isHash && activeSection === item.href.slice(1);
              if (!isHash) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative rounded px-1.5 py-0.5 text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:text-slate-400 dark:hover:text-white dark:focus-visible:ring-white/20"
                  >
                    {item.label}
                  </Link>
                );
              }
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    scrollToAnchor(item.href.slice(1));
                  }}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "relative transition-colors rounded px-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-white/20",
                    "after:absolute after:-bottom-1 after:left-0 after:w-full after:h-[2px] after:bg-slate-900 dark:after:bg-white after:transition-transform after:origin-left",
                    isActive
                      ? "text-slate-900 dark:text-white after:scale-x-100"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white after:scale-x-0 hover:after:scale-x-100"
                  )}
                >
                  {item.label}
                </a>
              );
            })}
          </div>

          {/* CTA (Desktop) */}
          <div className="hidden lg:flex items-center gap-4 relative z-10">
            <AccessibilityDropdown
              settings={accessibilitySettings}
              updateSettings={updateAccessibilitySettings}
              resetSettings={resetAccessibilitySettings}
            />
            <Link href="/auth/login" className="group flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-[background-color,color] px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-white/20">
              Log in
              <ArrowRight className="w-3.5 h-3.5 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-[opacity,margin] duration-300" aria-hidden="true" />
            </Link>
            <Button asChild className="group rounded-full bg-slate-900 dark:bg-amber-400 text-white dark:text-stone-950 hover:bg-slate-800 dark:hover:bg-amber-300 h-9 px-5 font-medium transition-colors text-sm focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-amber-300/50">
              <Link href="/join" className="flex items-center gap-1.5">
                Enter code
                <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Toggle & Actions */}
          <div className="flex items-center gap-2 lg:hidden relative z-10">
            <AccessibilityDropdown
              settings={accessibilitySettings}
              updateSettings={updateAccessibilitySettings}
              resetSettings={resetAccessibilitySettings}
            />
            <button
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:text-slate-400 dark:hover:text-white dark:focus-visible:ring-white/20"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              id="mobile-navigation"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute top-[calc(100%+12px)] inset-x-0 bg-[#fdfaf2] dark:bg-[#0a0a0a] border border-slate-200/80 dark:border-white/10 rounded-3xl overflow-hidden lg:hidden shadow-[0_20px_50px_-12px_rgba(15,23,42,0.18)] dark:shadow-2xl origin-top"
            >
              <nav aria-label="Mobile navigation" className="flex flex-col p-2">
                <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 font-mono">
                  Explore
                </p>
                <div className="flex flex-col gap-0.5">
                  {navItems.map((item) => {
                    const isHash = item.href.startsWith("#");
                    const isActive = isHash && activeSection === item.href.slice(1);
                    if (!isHash) {
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="w-full flex items-center gap-3 text-left text-base font-medium px-3 py-3 min-h-[44px] rounded-2xl transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-white/20"
                        >
                          <span
                            className="h-4 w-[2px] shrink-0 rounded-full bg-slate-300/80 dark:bg-white/20"
                            aria-hidden="true"
                          />
                          {item.label}
                        </Link>
                      );
                    }
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={(event) => {
                          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                          event.preventDefault();
                          scrollToAnchor(item.href.slice(1));
                          setIsMobileMenuOpen(false);
                        }}
                        aria-current={isActive ? "location" : undefined}
                        className={cn(
                          "w-full flex items-center gap-3 text-left text-base font-medium px-3 py-3 min-h-[44px] rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-white/20",
                          isActive
                            ? "bg-slate-900/[0.06] dark:bg-white/[0.08] text-slate-900 dark:text-white"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white"
                        )}
                      >
                        <span
                          className={cn(
                            "h-4 w-[2px] shrink-0 rounded-full transition-colors",
                            isActive ? "bg-slate-900 dark:bg-white" : "bg-slate-300/80 dark:bg-white/20"
                          )}
                          aria-hidden="true"
                        />
                        {item.label}
                      </a>
                    );
                  })}
                </div>

                <div className="mx-3 my-2 h-px bg-slate-200/80 dark:bg-white/10" role="separator" />

                <p className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 font-mono">
                  Account
                </p>
                <div className="flex flex-col gap-2 px-1 pb-1">
                  <Link
                    href="/auth/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="group w-full flex items-center justify-between gap-2 text-base font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-[background-color,color] px-3 py-3 min-h-[44px] rounded-2xl hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-white/20"
                  >
                    Log in
                    <ArrowRight className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity duration-200" aria-hidden="true" />
                  </Link>
                  <Button asChild className="rounded-2xl bg-slate-900 dark:bg-amber-400 text-white dark:text-stone-950 hover:bg-slate-800 dark:hover:bg-amber-300 w-full h-11 text-base font-medium focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-amber-300/50">
                    <Link href="/join" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center gap-2">
                      Enter session code
                      <KeyRound className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <MotionPrefs reduce={reduceMotion}>
        <main id="main-content" className="relative z-10">
          <LandingHero navHeight={navHeight} bgColor={bgColor} reduceMotion={reduceMotion} />

          {/* Platform principles strip */}
          <section
            id="disciplines"
            aria-label="CTRL platform principles"
            className="relative border-y border-slate-200/70 bg-slate-50 dark:border-white/5 dark:bg-[#0b0b0b]"
          >
            <div className="mx-auto max-w-[1440px] px-6 py-8 md:py-10">
              <Reveal variant="fade" className="mb-6 text-center text-xs font-mono uppercase tracking-[0.25em] text-slate-500 dark:text-slate-500">
                A consistent foundation for structured assessment
              </Reveal>
              <RevealGroup
                stagger={0.1}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 items-stretch"
              >
                {platformPillars.map((d) => {
                  const tint = disciplineTintStyles[d.tint];
                  return (
                    <RevealItem key={d.label} variant="zoom" className="h-full w-full">
                      <div className={cn(
                        "group flex h-full min-h-[5.5rem] w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition-transform duration-300 hover:-translate-y-0.5 dark:border-white/10 dark:bg-[#0a0a0a]",
                        tint.ring
                      )}>
                        <span className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-white/80 transition-colors",
                          tint.icon
                        )}>
                          <d.icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1 text-left text-sm font-medium leading-snug text-slate-700 dark:text-slate-200">{d.label}</span>
                      </div>
                    </RevealItem>
                  );
                })}
              </RevealGroup>
            </div>
          </section>

          <div className="relative mx-auto flex w-full max-w-[1440px] flex-col gap-24 overflow-hidden px-6 py-20 md:gap-32 md:py-28">

            {/* Narrative Capabilities Section */}
            <section id="capabilities" className="w-full">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <SectionHeading
                  eyebrow="The platform"
                  accent="cyan"
                  title={<>One platform. A more <GradientText accent="cyan">consistent assessment process.</GradientText></>}
                  body="CTRL connects preparation, delivery and review without exposing teams or candidates to unnecessary complexity."
                  centered
                />
              </div>

              <RevealGroup stagger={0.14} amount={0.1} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {/* Primary platform overview */}
                <RevealItem variant="zoom" className="md:col-span-3">
                  <div className="relative h-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 md:p-12 group transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-cyan-500/30 dark:border-white/10 dark:bg-[#0a0a0a] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    {/* reticle tick */}
                    <span aria-hidden className="pointer-events-none absolute right-5 top-5 h-4 w-4 border-r border-t border-slate-200 dark:border-white/10" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 md:gap-12">
                      <div className="flex-1">
                        <div className="mb-6 flex items-center gap-3">
                          <div className="h-11 w-11 rounded-full border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center">
                            <ListChecks className="h-5 w-5 text-cyan-500 dark:text-cyan-400" aria-hidden="true" />
                          </div>
                          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">01 // Setup</span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-medium text-slate-900 dark:text-white mb-4 text-balance font-display">A clear starting point.</h3>
                        <p className="text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                          Bring campaign details, participants and delivery information into one focused assessment experience.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-2">
                          {["Campaign-based", "Managed", "Consistent"].map((chip) => (
                            <span key={chip} className="rounded-full border border-cyan-500/20 bg-cyan-500/[0.06] px-3 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-300">
                              {chip}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Abstract assessment progress preview */}
                      <div className="flex-1 w-full relative rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#050505] overflow-hidden shadow-inner">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,rgba(6,182,212,0.06)_50%,transparent_100%)]" />
                        <div className="relative z-10 flex flex-col gap-3.5 p-5 font-mono">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="flex items-center gap-2 uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              <span className="relative flex h-1.5 w-1.5">
                                <span
                                  className={cn(
                                    "absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-60",
                                    !reduceMotion && "animate-ping"
                                  )}
                                  aria-hidden="true"
                                />
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-500" />
                              </span>
                              Assessment // In progress
                            </span>
                            <span className="text-slate-400 dark:text-slate-500 tabular-nums">03 / 04</span>
                          </div>

                          <div className="flex h-16 items-center justify-center gap-1 rounded-lg border border-slate-100 dark:border-white/5 bg-white/60 dark:bg-black/40 px-3">
                            {Array.from({ length: 16 }).map((_, i) => (
                              <div
                                key={i}
                                className={cn("h-1 flex-1 rounded-full", i < 11 ? "bg-cyan-500/70" : "bg-slate-200 dark:bg-white/10")}
                                style={{ height: "10px" }}
                              />
                            ))}
                          </div>

                          {/* Generic stage progression */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between rounded-md bg-white/60 px-2.5 py-1.5 text-[10px] uppercase tracking-wider dark:bg-black/40">
                              <span className="text-slate-500 dark:text-slate-400">Stage 01</span>
                              <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">Complete <CheckCircle2 className="h-3 w-3" aria-hidden="true" /></span>
                            </div>
                            <div className="flex items-center justify-between rounded-md bg-white/60 px-2.5 py-1.5 text-[10px] uppercase tracking-wider dark:bg-black/40">
                              <span className="text-slate-500 dark:text-slate-400">Stage 02</span>
                              <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">Complete <CheckCircle2 className="h-3 w-3" aria-hidden="true" /></span>
                            </div>
                            <div className="flex items-center justify-between rounded-md bg-white/60 px-2.5 py-1.5 text-[10px] uppercase tracking-wider dark:bg-black/40">
                              <span className="text-slate-500 dark:text-slate-400">Stage 03</span>
                              <span className="tabular-nums text-slate-400 dark:text-slate-500">In progress…</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] uppercase tracking-wider text-slate-500 dark:border-white/5 dark:text-slate-500">
                            <span>Guided journey</span>
                            <span>Secure delivery</span>
                            <span className="text-cyan-600 dark:text-cyan-400">Active</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </RevealItem>

                {/* Card 2: Delivery */}
                <RevealItem variant="zoom">
                  <div className="relative h-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 group flex flex-col transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-blue-500/30 dark:border-white/10 dark:bg-[#0a0a0a] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <span aria-hidden className="pointer-events-none absolute right-5 top-5 h-4 w-4 border-r border-t border-slate-200 dark:border-white/10" />
                    <div className="mb-6 flex items-center gap-3 relative z-10">
                      <div className="h-11 w-11 rounded-full border border-blue-500/20 bg-blue-500/10 flex items-center justify-center">
                        <ListChecks className="h-5 w-5 text-blue-500 dark:text-blue-400" aria-hidden="true" />
                      </div>
                      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">02 // Delivery</span>
                    </div>
                    <h3 className="text-xl font-medium text-slate-900 dark:text-white mb-3 relative z-10 text-balance font-display">Managed from one place</h3>
                    <p className="text-slate-600 dark:text-slate-400 font-light leading-relaxed mb-8 flex-1 relative z-10">
                      Keep invitations, readiness and assessment delivery connected through one clear process.
                    </p>
                    <div className="w-full rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#050505] overflow-hidden relative p-4 space-y-2">
                      {[
                        { id: "A", label: "Invitation", band: "Ready" },
                        { id: "B", label: "Readiness", band: "Set" },
                        { id: "C", label: "Assessment", band: "Next" },
                      ].map((row) => (
                        <div key={row.id} className="flex items-center gap-3 rounded-lg border border-slate-100 dark:border-white/5 bg-white/60 dark:bg-black/40 px-3 py-2">
                          <span className="font-mono text-[10px] text-slate-400">{row.id}</span>
                          <span className="flex-1 truncate text-xs text-slate-600 dark:text-slate-300">{row.label}</span>
                          <span className={cn(
                            "rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                            row.band === "Ready" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            row.band === "Set" && "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
                            row.band === "Next" && "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          )}>{row.band}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </RevealItem>

                {/* Card 3: Experience */}
                <RevealItem variant="zoom">
                  <div className="relative h-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 group flex flex-col transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-violet-500/30 dark:border-white/10 dark:bg-[#0a0a0a] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <span aria-hidden className="pointer-events-none absolute right-5 top-5 h-4 w-4 border-r border-t border-slate-200 dark:border-white/10" />
                    <div className="mb-6 flex items-center gap-3 relative z-10">
                      <div className="h-11 w-11 rounded-full border border-violet-500/20 bg-violet-500/10 flex items-center justify-center">
                        <Scale className="h-5 w-5 text-violet-500 dark:text-violet-400" aria-hidden="true" />
                      </div>
                      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">03 // Experience</span>
                    </div>
                    <h3 className="text-xl font-medium text-slate-900 dark:text-white mb-3 relative z-10 text-balance font-display">Clear at every stage</h3>
                    <p className="text-slate-600 dark:text-slate-400 font-light leading-relaxed mb-8 flex-1 relative z-10">
                      Give participants focused instructions and a consistent journey from readiness to completion.
                    </p>
                    <div className="w-full rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#050505] overflow-hidden relative p-4 space-y-2">
                      {[
                        { label: "Requirements", tag: "Ready", tone: "good" },
                        { label: "Guided assessment", tag: "", tone: "" },
                        { label: "Completion", tag: "Next", tone: "next" },
                      ].map((row) => (
                        <div key={row.label} className={cn(
                          "flex items-center gap-3 rounded-lg border px-3 py-2",
                          row.tone === "good" && "border-emerald-500/30 bg-emerald-500/[0.06]",
                          row.tone === "next" && "border-blue-500/30 bg-blue-500/[0.06]",
                          !row.tone && "border-slate-100 dark:border-white/5 bg-white/60 dark:bg-black/40"
                        )}>
                          <span className="flex-1 truncate text-xs text-slate-600 dark:text-slate-300">{row.label}</span>
                          {row.tag && (
                            <span className={cn(
                              "rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                              row.tone === "good" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                              row.tone === "next" && "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                            )}>{row.tag}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </RevealItem>

                {/* Card 4: Review */}
                <RevealItem variant="zoom">
                  <div className="relative h-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 group flex flex-col transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-emerald-500/30 dark:border-white/10 dark:bg-[#0a0a0a] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <span aria-hidden className="pointer-events-none absolute right-5 top-5 h-4 w-4 border-r border-t border-slate-200 dark:border-white/10" />
                    <div className="mb-6 flex items-center gap-3 relative z-10">
                      <div className="h-11 w-11 rounded-full border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
                      </div>
                      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">04 // Review</span>
                    </div>
                    <h3 className="text-xl font-medium text-slate-900 dark:text-white mb-3 relative z-10 text-balance font-display">Evidence brought together</h3>
                    <p className="text-slate-600 dark:text-slate-400 font-light leading-relaxed mb-8 flex-1 relative z-10">
                      Review outcomes and relevant context in one place while decisions remain with your team.
                    </p>
                    <div className="w-full rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#050505] overflow-hidden relative p-4">
                      <div className="mb-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-slate-100 dark:border-white/5 bg-white/60 dark:bg-black/40 px-3 py-2">
                          <div className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Record</div>
                          <div className="font-display text-xl font-medium text-slate-900 dark:text-white">Ready</div>
                        </div>
                        <div className="rounded-lg border border-slate-100 dark:border-white/5 bg-white/60 dark:bg-black/40 px-3 py-2">
                          <div className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Context</div>
                          <div className="font-display text-xl font-medium text-emerald-600 dark:text-emerald-400">Included</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {["Prepared", "Delivered", "Reviewed"].map((lvl) => (
                          <span key={lvl} className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                            {lvl}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </RevealItem>
              </RevealGroup>
            </section>

            <section id="workflow" className="w-full scroll-mt-32">
              <div className="mx-auto max-w-4xl text-center">
                <SectionHeading
                  eyebrow="One connected workflow"
                  accent="blue"
                  title={<>Clear for the team. <GradientText accent="blue">Calm for the candidate.</GradientText></>}
                  body="Follow the same controlled assessment process from either side. Switch views to see only the steps that matter."
                  centered
                />
              </div>

              <div
                role="tablist"
                aria-label="Choose a workflow"
                className="mx-auto mt-10 grid w-full max-w-md grid-cols-2 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-white/10 dark:bg-white/[0.04]"
              >
                {[
                  { id: "hiring" as const, label: "Hiring teams" },
                  { id: "candidate" as const, label: "Candidates" },
                ].map((audience) => {
                  const selected = workflowAudience === audience.id;
                  return (
                    <button
                      key={audience.id}
                      id={"workflow-" + audience.id + "-tab"}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls="workflow-panel"
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setWorkflowAudience(audience.id)}
                      onKeyDown={(event) => {
                        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                        event.preventDefault();
                        const nextAudience = audience.id === "hiring" ? "candidate" : "hiring";
                        setWorkflowAudience(nextAudience);
                        requestAnimationFrame(() => {
                          document.getElementById("workflow-" + nextAudience + "-tab")?.focus();
                        });
                      }}
                      className={cn(
                        "min-h-11 rounded-md px-4 py-2.5 text-sm font-semibold transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                        selected
                          ? "bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white"
                          : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      )}
                    >
                      {audience.label}
                    </button>
                  );
                })}
              </div>

              <div
                id="workflow-panel"
                role="tabpanel"
                aria-labelledby={"workflow-" + workflowAudience + "-tab"}
                className="mt-10"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={workflowAudience}
                    initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                    exit={reduceMotion ? {} : { opacity: 0, y: -8 }}
                    transition={{ duration: reduceMotion ? 0 : 0.24 }}
                    className="grid gap-4 lg:grid-cols-2"
                  >
                    {(workflowAudience === "hiring" ? hiringWorkflowSteps : candidateWorkflowSteps).map((step) => (
                      <article
                        key={step.title}
                        className="grid min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white/75 shadow-sm dark:border-white/10 dark:bg-[#090b0f] sm:grid-cols-[minmax(0,0.8fr)_minmax(15rem,1.2fr)] lg:grid-cols-1 xl:grid-cols-[minmax(0,0.78fr)_minmax(15rem,1.22fr)]"
                      >
                        <div className="flex min-w-0 flex-col p-6">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400">
                              {step.step} {"//"}
                            </span>
                            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-sky-500/20 bg-sky-500/[0.08] text-sky-600 dark:text-sky-400">
                              <step.icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                          </div>
                          <h3 className="mt-6 text-balance font-display text-2xl font-medium text-slate-900 dark:text-white">
                            {step.title}
                          </h3>
                          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                            {step.text}
                          </p>
                        </div>
                        <div className="min-w-0 overflow-hidden border-t border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20 sm:border-l sm:border-t-0 lg:border-l-0 lg:border-t xl:border-l xl:border-t-0">
                          <WorkflowVisual variant={step.visual} reduceMotion={reduceMotion} />
                        </div>
                      </article>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>

              <Reveal variant="fade-up" className="mt-8">
                <div className="grid divide-y divide-slate-200 border-y border-slate-200 dark:divide-white/10 dark:border-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
                  {[
                    ["Consistent by design", "A shared process keeps assessment delivery clear and considered."],
                    ["Flexible delivery", "Supported delivery options adapt to the needs of each organisation."],
                    ["Human-led outcomes", "CTRL supports the review; your team retains the decision."],
                  ].map(([title, text]) => (
                    <div key={title} className="px-5 py-6 md:px-7">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{text}</p>
                    </div>
                  ))}
                </div>
              </Reveal>
            </section>

            <section id="contracts" className="w-full">
              <div className="text-center mb-14 max-w-3xl mx-auto">
                <SectionHeading
                  eyebrow="Contract Options"
                  accent="cyan"
                  title={<>Contracts for the way you <GradientText accent="cyan">deliver.</GradientText></>}
                  body="Start with the access and delivery modes your team needs. Every option includes CTRL's core released assessments."
                  centered
                />
              </div>

              <RevealGroup stagger={0.12} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {contractData.options.map((option) => {
                  const details = contractDetails[option.tier];
                  const accent = accentStyles[details.accent];
                  const features = [
                    `${option.includedSeats} hiring manager ${option.includedSeats === 1 ? "seat" : "seats"}`,
                    "All Core released and future assessments",
                    option.tier === "essential"
                      ? "In-person delivery only"
                      : option.tier === "professional"
                      ? "In-person, remote and hybrid delivery"
                      : "In-person, remote and hybrid delivery",
                    option.tier === "founder" && option.discountPercent
                      ? `${option.discountPercent}% discount on upgrades and add-on assessments`
                      : null,
                  ].filter((feature): feature is string => Boolean(feature));

                  return (
                    <RevealItem key={option.tier} variant="fade-up" className="h-full">
                      <article className="flex h-full flex-col rounded-lg border border-slate-200 bg-white/75 p-6 shadow-sm transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className={cn("font-mono text-[10px] font-semibold uppercase tracking-[0.2em]", accent.text)}>
                              {details.badge}
                            </span>
                            <h3 className="mt-3 font-display text-2xl font-medium tracking-tight text-slate-900 dark:text-white">
                              {option.label}
                            </h3>
                          </div>
                          <span className={cn("mt-1 h-2 w-2 rounded-full", accent.dot)} aria-hidden="true" />
                        </div>
                        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
                          {details.summary}
                        </p>
                        <ul className="mt-6 space-y-3">
                          {features.map((feature) => (
                            <li key={feature} className="flex gap-3 text-sm leading-5 text-slate-700 dark:text-slate-300">
                              <CheckCircle2 className={cn("mt-0.5 h-4 w-4 shrink-0", accent.text)} aria-hidden="true" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-auto pt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                          {details.footnote}
                        </p>
                      </article>
                    </RevealItem>
                  );
                })}
              </RevealGroup>

              {contractData.founderOfferExpiresAt ? (
                <Reveal variant="fade-up">
                  <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Founder availability is controlled by the platform expiry date and is currently listed until{" "}
                    {new Date(contractData.founderOfferExpiresAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    .
                  </p>
                </Reveal>
              ) : null}
            </section>

          </div>

          {/* Contact Section — closing call to action */}
          <section id="contact" className="relative overflow-hidden border-t border-slate-200 dark:border-white/5">
            {/* Ambient radial glow — light, not a container */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(56,189,248,0.14), rgba(37,99,235,0.06) 45%, transparent 70%)",
              }}
              initial={reduceMotion ? false : { opacity: 0.65, scale: 0.92 }}
              animate={reduceMotion ? {} : { opacity: [0.65, 1, 0.65], scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative z-10 mx-auto w-full max-w-3xl px-6 py-28 md:py-40 text-center">
              <Reveal variant="zoom">
                {/* Crosshair kicker — echoes the logo motif */}
                <div className="mb-7 flex items-center justify-center gap-3 font-mono text-xs uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">
                  <span className="h-px w-8 bg-gradient-to-r from-transparent to-sky-500/60" />
                  Get Started
                  <span className="h-px w-8 bg-gradient-to-l from-transparent to-sky-500/60" />
                </div>

                <h2 className="mx-auto max-w-3xl text-balance font-display text-5xl font-medium leading-[1.04] tracking-tight text-slate-900 dark:text-white md:text-7xl">
                  Build an assessment process your team can{" "}
                  <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent dark:from-sky-300 dark:to-blue-400">
                    defend.
                  </span>
                </h2>

                <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400">
                  Configure delivery, protect assessment integrity and review structured
                  evidence—without turning hiring into an automated decision.
                </p>

                <div className="mt-11 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Button asChild className="group h-12 rounded-full bg-slate-900 px-9 text-sm font-medium text-white shadow-lg shadow-slate-900/10 transition-colors hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-400 dark:bg-white dark:text-black dark:shadow-white/10 dark:hover:bg-slate-200 dark:focus-visible:ring-white/50 md:h-14 md:text-base">
                    <Link href="/pricing" className="flex items-center justify-center">
                      View plans
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => scrollToAnchor("contracts")} className="h-12 rounded-full border border-slate-200 bg-transparent px-9 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white dark:focus-visible:ring-white/20 md:h-14 md:text-base">
                    View contracts
                  </Button>
                </div>

                <div className="mx-auto mt-12 flex max-w-xl flex-wrap items-center justify-center gap-x-7 gap-y-2 border-t border-slate-200/70 pt-7 text-xs font-mono uppercase tracking-[0.15em] text-slate-500 dark:border-white/5 dark:text-slate-400">
                  <span>Secure onboarding</span>
                  <span className="hidden h-3 w-px bg-slate-300 dark:bg-white/10 sm:inline-block" />
                  <span>Clear account access</span>
                  <span className="hidden h-3 w-px bg-slate-300 dark:bg-white/10 sm:inline-block" />
                  <span>Human-reviewed evidence</span>
                </div>
              </Reveal>
            </div>
          </section>

          <footer className="relative z-20 overflow-hidden border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#020202] pt-20 pb-10">
            {/* Top accent line */}
            <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />

            <Reveal variant="fade-up">
              <div className="mx-auto max-w-[1440px] px-6">
                <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5 lg:gap-8 mb-12">
                  <div className="lg:col-span-2 flex flex-col gap-6 max-w-sm">
                    <BrandLogo layout="stacked" className="h-14 w-[6.25rem] self-start" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-light">
                      Structured assessment experiences and reviewable evidence for organisations making important hiring decisions.
                    </p>
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.16em] text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden="true" />
                      Assessment platform for organisations
                    </span>
                  </div>

                  <div className="flex flex-col gap-4">
                    <h4 className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                      <span className="h-1 w-1 rounded-full bg-sky-500" /> Explore
                    </h4>
                    {navItems.map(item => (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={(event) => {
                          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                          event.preventDefault();
                          scrollToAnchor(item.href.slice(1));
                        }}
                        className="group flex items-center gap-1.5 text-left text-sm font-light text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400/40 dark:focus-visible:ring-white/20 rounded"
                      >
                        {item.label}
                        <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-[transform,opacity] duration-300 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" />
                      </a>
                    ))}
                  </div>

                  <div className="flex flex-col gap-4">
                    <h4 className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                      <span className="h-1 w-1 rounded-full bg-sky-500" /> Legal
                    </h4>
                    {UK_LEGAL_FOOTER_LINKS.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        className="group flex items-center gap-1.5 rounded text-sm font-light text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400/40 dark:text-slate-400 dark:hover:text-white dark:focus-visible:ring-white/20"
                      >
                        {l.label}
                        <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-[transform,opacity] duration-300 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" />
                      </Link>
                    ))}
                  </div>

                  <div className="flex flex-col gap-4">
                    <h4 className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                      <span className="h-1 w-1 rounded-full bg-sky-500" /> Access
                    </h4>
                    {[
                      { label: "Get Started", href: "/pricing" },
                      { label: "Log in", href: "/auth/login" },
                    ].map((l) => (
                      <Link
                        key={l.label}
                        href={l.href}
                        className="group flex items-center gap-1.5 rounded text-sm font-light text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400/40 dark:text-slate-400 dark:hover:text-white dark:focus-visible:ring-white/20"
                      >
                        {l.label}
                        <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-[transform,opacity] duration-300 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Platform principles strip */}
                <div className="mb-10 flex flex-wrap items-center gap-2 border-t border-slate-200/70 dark:border-white/5 pt-8">
                  <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Platform
                  </span>
                  {platformPillars.map((d) => (
                    <span
                      key={d.label}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-600 dark:text-slate-300"
                    >
                      <d.icon className="h-3 w-3 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                      {d.label}
                    </span>
                  ))}
                </div>

                <div className="flex flex-col gap-4 border-t border-slate-200 dark:border-white/10 pt-8 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm font-light text-slate-500 dark:text-slate-400">
                    © {new Date().getFullYear()} <CtrlText className="h-[0.8em]" /> Recruitment. All rights reserved.
                  </p>
                  <button
                    type="button"
                    onClick={scrollToTop}
                    className="group inline-flex items-center gap-2 self-start font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 dark:focus-visible:ring-white/20 rounded-full md:self-auto"
                  >
                    Back to top
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 dark:border-white/10 transition-colors group-hover:border-slate-400 dark:group-hover:border-white/30">
                      <ArrowRight className="h-3 w-3 -rotate-90 transition-transform duration-300 group-hover:-translate-y-0.5" aria-hidden="true" />
                    </span>
                  </button>
                </div>
              </div>
            </Reveal>
          </footer>
        </main>
      </MotionPrefs>
    </div>
  );
}
