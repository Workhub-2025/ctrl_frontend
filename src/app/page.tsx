"use client";

import { LandingHero } from "@/components/landing/landing-hero";
import { BrandLogo, CtrlText } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Activity,
  PhoneCall,
  Menu,
  Crosshair,
  X,
  CheckCircle2,
  Headphones,
  Siren,
  Network,
  Gauge,
  ListChecks,
  Scale,
  Keyboard,
  KeyRound,
  CalendarClock,
  Trophy,
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
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
  ZoomOnScroll,
  Parallax,
} from "@/components/landing/scroll-effects";
import {
  WorkflowVisual,
  type WorkflowVisualVariant,
} from "@/components/landing/workflow-visuals";
import { UK_LEGAL_FOOTER_LINKS } from "@/lib/legal/uk-compliance";

const navItems = [
  { label: "Disciplines", href: "#disciplines" },
  { label: "Hiring Workflow", href: "#workflow" },
  { label: "Candidate Workflow", href: "#candidate-experience" },
  { label: "Contracts", href: "#contracts" },
];

const disciplines: { label: string; icon: typeof Siren; tint: DisciplineTint }[] = [
  { label: "Emergency Dispatch", icon: Siren, tint: "rose" },
  { label: "Control Room Operations", icon: Gauge, tint: "amber" },
  { label: "Contact & Service Centres", icon: Headphones, tint: "cyan" },
  { label: "Command & Coordination", icon: Network, tint: "violet" },
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
    title: "Build the Campaign",
    text: "Bundle the assessments that matter for the role — call simulation, prioritisation, situational judgement and typing — into a single campaign, then generate a secure invitation link to share with candidates.",
    icon: ListChecks,
    visual: "campaign",
  },
  {
    step: "02",
    title: "Invite & Schedule Sessions",
    text: "Invite candidates and schedule remote or in-person sessions with a set date and time. Sessions stay locked until they're due, and in-person sessions carry a venue address candidates can map.",
    icon: CalendarClock,
    visual: "sessions",
  },
  {
    step: "03",
    title: "Run Live Sessions",
    text: "Track candidates from one sessions-first overview as they work through the assessments. Lock or unlock candidates on demand and watch progress update in real time.",
    icon: Activity,
    visual: "tracking",
  },
  {
    step: "04",
    title: "Compare & Progress",
    text: "Once assessments are complete, progress switches to an overall score. Compare candidates side by side and progress the strongest to the next stage with confidence.",
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
    title: "Activate with Your Access Code",
    text: "Register using the access code from your agency. It places you in the right workspace and lists every assessment session you've been invited to.",
    icon: KeyRound,
    visual: "access",
  },
  {
    step: "02",
    title: "Your Session Unlocks",
    text: "Remote sessions unlock automatically at the scheduled time; in-person sessions are unlocked on site. Each one shows the role and, for in-person, a venue you can open on a map.",
    icon: CalendarClock,
    visual: "schedule",
  },
  {
    step: "03",
    title: "Complete the Assessments",
    text: "Work through your assigned modules — call simulation, prioritisation, situational judgement and typing — at the pace each assessment allows.",
    icon: ListChecks,
    visual: "modules",
  },
  {
    step: "04",
    title: "See Your Outcome",
    text: "Your performance is shared directly with the hiring team, who update your status to Completed, Progressed or Unsuccessful.",
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
  grandfatherAvailable: boolean;
  grandfatherOfferExpiresAt: string | null;
  options: ContractOption[];
};

const fallbackContractOptions: ContractOptionsData = {
  grandfatherAvailable: true,
  grandfatherOfferExpiresAt: null,
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
    summary: "Launch-window contract with wider delivery modes and founder loyalty benefits.",
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
  const hiringRef = useRef<HTMLElement | null>(null);
  const candidateRef = useRef<HTMLElement | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [navHeight, setNavHeight] = useState(96);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const [contractData, setContractData] = useState<ContractOptionsData>(fallbackContractOptions);
  const {
    settings: accessibilitySettings,
    updateSettings: updateAccessibilitySettings,
    resetSettings: resetAccessibilitySettings,
    reduceMotion,
    themeClassName: bgColor,
  } = useAccessibilitySettings();

  const { scrollYProgress: hiringProgress } = useScroll({
    target: hiringRef,
    offset: ["start center", "end center"]
  });
  const hiringHeight = useTransform(hiringProgress, [0, 1], ["0%", "100%"]);

  const { scrollYProgress: candidateProgress } = useScroll({
    target: candidateRef,
    offset: ["start center", "end center"]
  });
  const candidateHeight = useTransform(candidateProgress, [0, 1], ["0%", "100%"]);

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
    <div className={cn(bgColor, "ctrl-landing-page selection:bg-white/20 font-sans min-h-screen transition-colors duration-500")}>
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
            className="fixed inset-0 z-40 bg-slate-900/10 dark:bg-black/50 backdrop-blur-[2px] lg:hidden"
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
            ? "bg-white/80 dark:bg-[#0a0a0a]/90 backdrop-blur-md border-slate-200 dark:border-white/10 py-3 shadow-md dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
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
              const isActive = activeSection === item.href.slice(1);
              return (
                <button
                  key={item.href}
                  onClick={() => scrollToAnchor(item.href.slice(1))}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative transition-colors rounded px-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-white/20",
                    "after:absolute after:-bottom-1 after:left-0 after:w-full after:h-[2px] after:bg-slate-900 dark:after:bg-white after:transition-transform after:origin-left",
                    isActive
                      ? "text-slate-900 dark:text-white after:scale-x-100"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white after:scale-x-0 hover:after:scale-x-100"
                  )}
                >
                  {item.label}
                </button>
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
            <Link href="/auth/register?mode=login" className="group flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-[background-color,color] px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-white/20">
              Log in
              <ArrowRight className="w-3.5 h-3.5 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" aria-hidden="true" />
            </Link>
            <Button asChild className="group rounded-full bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200 h-9 px-5 font-medium transition-colors text-sm focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-white/50">
              <Link href="/auth/register?mode=register" className="flex items-center gap-1.5">
                Get Started
                <ArrowRight className="w-3.5 h-3.5 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" aria-hidden="true" />
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
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-white/20 rounded-lg p-1"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute top-[calc(100%+12px)] inset-x-0 bg-[#fdfaf2]/95 dark:bg-[#0a0a0a]/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-3xl overflow-hidden lg:hidden shadow-[0_20px_50px_-12px_rgba(15,23,42,0.18)] dark:shadow-2xl origin-top"
            >
              <nav aria-label="Mobile navigation" className="flex flex-col p-2">
                <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 font-mono">
                  Explore
                </p>
                <div className="flex flex-col gap-0.5">
                  {navItems.map((item) => {
                    const isActive = activeSection === item.href.slice(1);
                    return (
                      <button
                        key={item.href}
                        onClick={() => {
                          scrollToAnchor(item.href.slice(1));
                          setIsMobileMenuOpen(false);
                        }}
                        aria-current={isActive ? "true" : undefined}
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
                      </button>
                    );
                  })}
                </div>

                <div className="mx-3 my-2 h-px bg-slate-200/80 dark:bg-white/10" role="separator" />

                <p className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 font-mono">
                  Account
                </p>
                <div className="flex flex-col gap-2 px-1 pb-1">
                  <Link
                    href="/auth/register?mode=login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="group w-full flex items-center justify-between gap-2 text-base font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-[background-color,color] px-3 py-3 min-h-[44px] rounded-2xl hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-white/20"
                  >
                    Log in
                    <ArrowRight className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity duration-200" aria-hidden="true" />
                  </Link>
                  <Button asChild className="rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200 w-full h-11 text-base font-medium focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-white/50">
                    <Link href="/auth/register?mode=register" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center gap-2">
                      Get Started
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
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

          {/* Disciplines marquee strip */}
          <section
            id="disciplines"
            aria-label="Operational disciplines CTRL is built for"
            className="relative border-y border-slate-200/70 dark:border-white/5 bg-white/40 dark:bg-white/[0.015] backdrop-blur-sm"
          >
            <div className="mx-auto max-w-[1440px] px-6 py-8 md:py-10">
              <Reveal variant="fade" className="mb-6 text-center text-xs font-mono uppercase tracking-[0.25em] text-slate-500 dark:text-slate-500">
                Built for high-stakes operational roles
              </Reveal>
              <RevealGroup
                stagger={0.1}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 items-stretch"
              >
                {disciplines.map((d) => {
                  const tint = disciplineTintStyles[d.tint];
                  return (
                    <RevealItem key={d.label} variant="zoom" className="h-full w-full">
                      <div className={cn(
                        "group flex h-full min-h-[5.5rem] w-full items-center gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#0a0a0a]/60 px-4 py-3.5 backdrop-blur-md transition-transform duration-300 hover:-translate-y-0.5",
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

          <div className="relative px-6 py-24 md:py-32 flex flex-col gap-28 md:gap-40 overflow-hidden w-full max-w-[1440px] mx-auto">

            {/* Narrative Capabilities Section */}
            <section id="capabilities" className="w-full">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <SectionHeading
                  eyebrow="Core Engine"
                  accent="cyan"
                  title={<>Assess Skills. <GradientText accent="cyan">Simulate Reality.</GradientText></>}
                  centered
                />
              </div>

              <RevealGroup stagger={0.14} amount={0.1} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {/* Card 1 - Full Width: Live Call Simulation */}
                <RevealItem variant="zoom" className="md:col-span-3">
                  <div className="relative h-full overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0a0a0a]/90 backdrop-blur-md p-8 md:p-12 group transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] hover:border-cyan-500/30">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    {/* reticle tick */}
                    <span aria-hidden className="pointer-events-none absolute right-5 top-5 h-4 w-4 border-r border-t border-slate-200 dark:border-white/10" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 md:gap-12">
                      <div className="flex-1">
                        <div className="mb-6 flex items-center gap-3">
                          <div className="h-11 w-11 rounded-full border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center">
                            <PhoneCall className="h-5 w-5 text-cyan-500 dark:text-cyan-400" aria-hidden="true" />
                          </div>
                          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">01 // Call Simulation</span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-medium text-slate-900 dark:text-white mb-4 text-balance font-display">The Flagship: Live Call Simulation.</h3>
                        <p className="text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                          Candidates work realistic dispatch and customer calls, capturing caller details in real time as the audio plays. CTRL grades every answer against a millisecond-perfect Earliest Speech Point, scoring both accuracy and how quickly the right information was captured.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-2">
                          {["Real-time data capture", "Millisecond ESP grading", "Dispatch scenarios"].map((chip) => (
                            <span key={chip} className="rounded-full border border-cyan-500/20 bg-cyan-500/[0.06] px-3 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-300">
                              {chip}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Live call HUD */}
                      <div className="flex-1 w-full relative rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#050505] overflow-hidden shadow-inner">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,rgba(6,182,212,0.06)_50%,transparent_100%)]" />
                        <div className="relative z-10 flex flex-col gap-3.5 p-5 font-mono">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="flex items-center gap-2 uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-500 opacity-60" />
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-500" />
                              </span>
                              Live // Caller audio
                            </span>
                            <span className="text-slate-400 dark:text-slate-500 tabular-nums">02:14</span>
                          </div>

                          <div className="flex h-16 items-center justify-center gap-1 rounded-lg border border-slate-100 dark:border-white/5 bg-white/60 dark:bg-black/40 px-3">
                            {[14, 26, 18, 38, 22, 44, 20, 34, 16, 40, 24, 30, 18, 36, 22, 28].map((peak, i) => (
                              <motion.div
                                key={i}
                                className="w-1 rounded-full bg-cyan-500/60"
                                style={{ height: "10px" }}
                                animate={reduceMotion ? {} : { height: ["10px", `${peak}px`, "10px"] }}
                                transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.06, ease: "easeInOut" }}
                              />
                            ))}
                          </div>

                          {/* Captured caller fields against ESP timing */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between rounded-md bg-white/60 px-2.5 py-1.5 text-[10px] uppercase tracking-wider dark:bg-black/40">
                              <span className="text-slate-500 dark:text-slate-400">Door no.</span>
                              <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">14 <CheckCircle2 className="h-3 w-3" /></span>
                            </div>
                            <div className="flex items-center justify-between rounded-md bg-white/60 px-2.5 py-1.5 text-[10px] uppercase tracking-wider dark:bg-black/40">
                              <span className="text-slate-500 dark:text-slate-400">Street</span>
                              <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">Oak Lane <CheckCircle2 className="h-3 w-3" /></span>
                            </div>
                            <div className="flex items-center justify-between rounded-md bg-white/60 px-2.5 py-1.5 text-[10px] uppercase tracking-wider dark:bg-black/40">
                              <span className="text-slate-500 dark:text-slate-400">Postcode</span>
                              <span className="tabular-nums text-slate-400 dark:text-slate-500">capturing…</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] uppercase tracking-wider text-slate-500 dark:border-white/5 dark:text-slate-500">
                            <span>Accuracy 98%</span>
                            <span>ESP +0.4s</span>
                            <span className="text-cyan-600 dark:text-cyan-400">On target</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </RevealItem>

                {/* Card 2: Prioritisation */}
                <RevealItem variant="zoom">
                  <div className="relative h-full overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0a0a0a]/90 backdrop-blur-md p-8 group flex flex-col transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] hover:border-blue-500/30">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <span aria-hidden className="pointer-events-none absolute right-5 top-5 h-4 w-4 border-r border-t border-slate-200 dark:border-white/10" />
                    <div className="mb-6 flex items-center gap-3 relative z-10">
                      <div className="h-11 w-11 rounded-full border border-blue-500/20 bg-blue-500/10 flex items-center justify-center">
                        <ListChecks className="h-5 w-5 text-blue-500 dark:text-blue-400" aria-hidden="true" />
                      </div>
                      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">02 // Prioritisation</span>
                    </div>
                    <h3 className="text-xl font-medium text-slate-900 dark:text-white mb-3 relative z-10 text-balance font-display">Rank Incidents Under the Clock</h3>
                    <p className="text-slate-600 dark:text-slate-400 font-light leading-relaxed mb-8 flex-1 relative z-10">
                      Candidates drag live incidents into priority order against a timer. Scored on how closely their ranking matches the optimal response sequence.
                    </p>
                    <div className="w-full rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#050505] overflow-hidden relative p-4 space-y-2">
                      {[
                        { id: "A", label: "Active fire — occupied", band: "High" },
                        { id: "C", label: "Welfare check", band: "Med" },
                        { id: "E", label: "Noise complaint", band: "Low" },
                      ].map((row) => (
                        <div key={row.id} className="flex items-center gap-3 rounded-lg border border-slate-100 dark:border-white/5 bg-white/60 dark:bg-black/40 px-3 py-2">
                          <span className="font-mono text-[10px] text-slate-400">{row.id}</span>
                          <span className="flex-1 truncate text-xs text-slate-600 dark:text-slate-300">{row.label}</span>
                          <span className={cn(
                            "rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                            row.band === "High" && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                            row.band === "Med" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                            row.band === "Low" && "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          )}>{row.band}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </RevealItem>

                {/* Card 3: Situational Judgement */}
                <RevealItem variant="zoom">
                  <div className="relative h-full overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0a0a0a]/90 backdrop-blur-md p-8 group flex flex-col transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] hover:border-violet-500/30">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <span aria-hidden className="pointer-events-none absolute right-5 top-5 h-4 w-4 border-r border-t border-slate-200 dark:border-white/10" />
                    <div className="mb-6 flex items-center gap-3 relative z-10">
                      <div className="h-11 w-11 rounded-full border border-violet-500/20 bg-violet-500/10 flex items-center justify-center">
                        <Scale className="h-5 w-5 text-violet-500 dark:text-violet-400" aria-hidden="true" />
                      </div>
                      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">03 // Situational Judgement</span>
                    </div>
                    <h3 className="text-xl font-medium text-slate-900 dark:text-white mb-3 relative z-10 text-balance font-display">Judgement in Real Context</h3>
                    <p className="text-slate-600 dark:text-slate-400 font-light leading-relaxed mb-8 flex-1 relative z-10">
                      Realistic workplace scenarios where candidates choose the most and least effective response, graded against a key built by subject-matter experts.
                    </p>
                    <div className="w-full rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#050505] overflow-hidden relative p-4 space-y-2">
                      {[
                        { label: "Escalate to supervisor", tag: "Most", tone: "good" },
                        { label: "Reassure and log details", tag: "", tone: "" },
                        { label: "Ignore the request", tag: "Least", tone: "bad" },
                      ].map((row) => (
                        <div key={row.label} className={cn(
                          "flex items-center gap-3 rounded-lg border px-3 py-2",
                          row.tone === "good" && "border-emerald-500/30 bg-emerald-500/[0.06]",
                          row.tone === "bad" && "border-rose-500/30 bg-rose-500/[0.06]",
                          !row.tone && "border-slate-100 dark:border-white/5 bg-white/60 dark:bg-black/40"
                        )}>
                          <span className="flex-1 truncate text-xs text-slate-600 dark:text-slate-300">{row.label}</span>
                          {row.tag && (
                            <span className={cn(
                              "rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                              row.tone === "good" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                              row.tone === "bad" && "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                            )}>{row.tag}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </RevealItem>

                {/* Card 4: Typing */}
                <RevealItem variant="zoom">
                  <div className="relative h-full overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0a0a0a]/90 backdrop-blur-md p-8 group flex flex-col transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] hover:border-emerald-500/30">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.07] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <span aria-hidden className="pointer-events-none absolute right-5 top-5 h-4 w-4 border-r border-t border-slate-200 dark:border-white/10" />
                    <div className="mb-6 flex items-center gap-3 relative z-10">
                      <div className="h-11 w-11 rounded-full border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center">
                        <Keyboard className="h-5 w-5 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
                      </div>
                      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">04 // Typing</span>
                    </div>
                    <h3 className="text-xl font-medium text-slate-900 dark:text-white mb-3 relative z-10 text-balance font-display">Speed Meets Accuracy</h3>
                    <p className="text-slate-600 dark:text-slate-400 font-light leading-relaxed mb-8 flex-1 relative z-10">
                      Real-time WPM, accuracy and error tracking on realistic call-handler passages — across Base, Intermediate and Extreme difficulty.
                    </p>
                    <div className="w-full rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#050505] overflow-hidden relative p-4">
                      <div className="mb-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-slate-100 dark:border-white/5 bg-white/60 dark:bg-black/40 px-3 py-2">
                          <div className="font-mono text-[9px] uppercase tracking-wider text-slate-500">WPM</div>
                          <div className="font-display text-xl font-medium text-slate-900 dark:text-white tabular-nums">72</div>
                        </div>
                        <div className="rounded-lg border border-slate-100 dark:border-white/5 bg-white/60 dark:bg-black/40 px-3 py-2">
                          <div className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Accuracy</div>
                          <div className="font-display text-xl font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">98%</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {["Base", "Intermediate", "Extreme"].map((lvl) => (
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

            {/* Hiring Workflow Section */}
            <section id="workflow" ref={hiringRef} className="w-full">
              <div className="text-center mb-16 max-w-3xl mx-auto">
                <SectionHeading
                  eyebrow="For Hiring Teams"
                  accent="blue"
                  title={<>Build Stronger Talent Pipelines with <GradientText accent="blue">Confidence</GradientText></>}
                  centered
                />
              </div>
              <div className="relative max-w-5xl mx-auto py-8">
                <div className="absolute left-[39px] md:left-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-white/5 md:-translate-x-1/2" />
                <motion.div
                  className="absolute left-[39px] md:left-1/2 top-0 w-px bg-gradient-to-b from-transparent via-blue-500 to-blue-400 md:-translate-x-1/2 shadow-[0_0_15px_rgba(59,130,246,0.4)] dark:shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                  style={{ height: hiringHeight, transformOrigin: "top" }}
                />

                <div className="space-y-24 md:space-y-32 relative z-10">
                  {hiringWorkflowSteps.map((step, i) => (
                    <div key={step.title} className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 md:gap-16 items-start md:items-center relative">
                      <div className={cn("pl-20 md:pl-0", i % 2 === 0 ? "md:text-right md:col-start-1 md:row-start-1" : "md:col-start-3 md:text-left md:row-start-1")}>
                        <Reveal variant={i % 2 === 0 ? "right" : "left"}>
                          <div className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 mb-3">{step.step} {"//"}</div>
                          <h4 className="text-2xl md:text-3xl font-medium text-slate-900 dark:text-white mb-3 text-balance font-display">{step.title}</h4>
                          <p className="text-lg text-slate-600 dark:text-slate-400 font-light leading-relaxed">{step.text}</p>
                        </Reveal>
                      </div>
                      <div className="absolute left-[15px] md:static md:col-start-2 md:row-start-1 top-2 md:top-auto w-12 h-12 rounded-full border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-[#040f24] flex items-center justify-center z-20 shadow-sm dark:shadow-[0_0_20px_rgba(0,0,0,0.8)] mt-2 md:mt-0">
                        <step.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                      </div>
                      <div className={cn("pl-20 md:pl-0 w-full", i % 2 === 0 ? "md:col-start-3 md:row-start-1" : "md:col-start-1 md:row-start-1")}>
                        <Parallax distance={36}>
                          <WorkflowVisual variant={step.visual} reduceMotion={reduceMotion} />
                        </Parallax>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Candidate Workflow Section */}
            <section id="candidate-experience" ref={candidateRef} className="w-full">
              <div className="text-center mb-16 max-w-3xl mx-auto">
                <SectionHeading
                  eyebrow="For Candidates"
                  accent="emerald"
                  title={<>Where Capability <GradientText accent="emerald">Speaks for Itself</GradientText></>}
                  centered
                />
              </div>
              <div className="relative max-w-5xl mx-auto py-8">
                <div className="absolute left-[39px] md:left-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-white/5 md:-translate-x-1/2" />
                <motion.div
                  className="absolute left-[39px] md:left-1/2 top-0 w-px bg-gradient-to-b from-transparent via-cyan-500 to-cyan-400 md:-translate-x-1/2 shadow-[0_0_15px_rgba(6,182,212,0.3)] dark:shadow-[0_0_15px_rgba(6,182,212,0.6)]"
                  style={{ height: candidateHeight, transformOrigin: "top" }}
                />

                <div className="space-y-24 md:space-y-32 relative z-10">
                  {candidateWorkflowSteps.map((step, i) => (
                    <div key={step.title} className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 md:gap-16 items-start md:items-center relative">
                      <div className={cn("pl-20 md:pl-0", i % 2 === 0 ? "md:text-right md:col-start-1 md:row-start-1" : "md:col-start-3 md:text-left md:row-start-1")}>
                        <Reveal variant={i % 2 === 0 ? "right" : "left"}>
                          <div className="text-xs font-mono font-semibold text-cyan-600 dark:text-cyan-400 mb-3">{step.step} {"//"}</div>
                          <h4 className="text-2xl md:text-3xl font-medium text-slate-900 dark:text-white mb-3 text-balance font-display">{step.title}</h4>
                          <p className="text-lg text-slate-600 dark:text-slate-400 font-light leading-relaxed">{step.text}</p>
                        </Reveal>
                      </div>
                      <div className="absolute left-[15px] md:static md:col-start-2 md:row-start-1 top-2 md:top-auto w-12 h-12 rounded-full border border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-[#041d24] flex items-center justify-center z-20 shadow-sm dark:shadow-[0_0_20px_rgba(0,0,0,0.8)] mt-2 md:mt-0">
                        <step.icon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
                      </div>
                      <div className={cn("pl-20 md:pl-0 w-full", i % 2 === 0 ? "md:col-start-3 md:row-start-1" : "md:col-start-1 md:row-start-1")}>
                        <Parallax distance={36}>
                          <WorkflowVisual variant={step.visual} reduceMotion={reduceMotion} />
                        </Parallax>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Outcomes & Assurance Section (Replaces Platform Overview) */}
            <section id="solutions" className="w-full relative py-20">
              <div className="text-center mb-16 max-w-3xl mx-auto">
                <SectionHeading
                  eyebrow="Outcomes & Assurance"
                  accent="violet"
                  title={<>Built for <GradientText accent="violet">high-trust decisions.</GradientText></>}
                  centered
                />
              </div>

              <div className="mx-auto w-full max-w-6xl px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <Reveal variant="fade-up">
                    <div className="flex flex-col h-full rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] p-8 transition-all hover:scale-[1.01] hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400 mb-6">
                        <Scale className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <h4 className="text-xl font-medium text-slate-900 dark:text-white mb-2">Evidence-Led Hiring</h4>
                      <p className="text-sm font-light leading-relaxed text-slate-600 dark:text-slate-400">
                        Assess practical judgement, typing speed, and situational performance. Base recruitment on structured, reviewable data rather than intuition.
                      </p>
                    </div>
                  </Reveal>

                  <Reveal variant="fade-up">
                    <div className="flex flex-col h-full rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] p-8 transition-all hover:scale-[1.01] hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400 mb-6">
                        <ListChecks className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <h4 className="text-xl font-medium text-slate-900 dark:text-white mb-2">Controlled Delivery</h4>
                      <p className="text-sm font-light leading-relaxed text-slate-600 dark:text-slate-400">
                        Support both remote and proctored in-person assessment flows. Session isolation, heartbeat checks, and timed submissions prevent external interference.
                      </p>
                    </div>
                  </Reveal>

                  <Reveal variant="fade-up">
                    <div className="flex flex-col h-full rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] p-8 transition-all hover:scale-[1.01] hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400 mb-6">
                        <Activity className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <h4 className="text-xl font-medium text-slate-900 dark:text-white mb-2">Decision Support</h4>
                      <p className="text-sm font-light leading-relaxed text-slate-600 dark:text-slate-400">
                        Detailed performance breakdowns and comparative metrics for hiring managers. Align candidates by clear operational criteria.
                      </p>
                    </div>
                  </Reveal>

                  <Reveal variant="fade-up">
                    <div className="flex flex-col h-full rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] p-8 transition-all hover:scale-[1.01] hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400 mb-6">
                        <KeyRound className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <h4 className="text-xl font-medium text-slate-900 dark:text-white mb-2">High-Trust Workflows</h4>
                      <p className="text-sm font-light leading-relaxed text-slate-600 dark:text-slate-400">
                        Tenant-isolated candidate records, secure access codes, and auditable action trails preserve organizational compliance and user privacy.
                      </p>
                    </div>
                  </Reveal>
                </div>


              </div>
            </section>

            <section id="contracts" className="w-full">
              <div className="text-center mb-14 max-w-3xl mx-auto">
                <SectionHeading
                  eyebrow="Contract Options"
                  accent="cyan"
                  title={<>Choose the contract that fits your <GradientText accent="cyan">hiring rhythm</GradientText></>}
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
                      : "In-person, remote and hybrid delivery (included free)",
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

              {contractData.grandfatherOfferExpiresAt ? (
                <Reveal variant="fade-up">
                  <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Founder availability is controlled by the platform expiry date and is currently listed until{" "}
                    {new Date(contractData.grandfatherOfferExpiresAt).toLocaleDateString("en-GB", {
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
                <div className="mb-7 flex items-center justify-center gap-3 font-mono text-[11px] uppercase tracking-[0.28em] text-sky-600 dark:text-sky-400">
                  <span className="h-px w-8 bg-gradient-to-r from-transparent to-sky-500/60" />
                  Get Started
                  <span className="h-px w-8 bg-gradient-to-l from-transparent to-sky-500/60" />
                </div>

                <h2 className="mx-auto max-w-3xl text-balance font-display text-5xl font-medium leading-[1.04] tracking-tight text-slate-900 dark:text-white md:text-7xl">
                  Ready to transform your{" "}
                  <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent dark:from-sky-300 dark:to-blue-400">
                    recruitment process?
                  </span>
                </h2>



                <div className="mt-11 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Button asChild className="group h-12 rounded-full bg-slate-900 px-9 text-sm font-medium text-white shadow-lg shadow-slate-900/10 transition-colors hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-400 dark:bg-white dark:text-black dark:shadow-white/10 dark:hover:bg-slate-200 dark:focus-visible:ring-white/50 md:h-14 md:text-base">
                    <Link href="/auth/register?mode=register" className="flex items-center justify-center">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => scrollToAnchor("capabilities")} className="h-12 rounded-full border border-slate-200 bg-transparent px-9 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white dark:focus-visible:ring-white/20 md:h-14 md:text-base">
                    Explore Platform
                  </Button>
                </div>

                <div className="mx-auto mt-12 flex max-w-md flex-wrap items-center justify-center gap-x-7 gap-y-2 border-t border-slate-200/70 pt-7 text-[11px] font-mono uppercase tracking-[0.18em] text-slate-400 dark:border-white/5 dark:text-slate-500">
                  <span>Access-code onboarding</span>
                  <span className="hidden h-3 w-px bg-slate-300 dark:bg-white/10 sm:inline-block" />
                  <span>Role-built portals</span>
                  <span className="hidden h-3 w-px bg-slate-300 dark:bg-white/10 sm:inline-block" />
                  <span>No setup required</span>
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
                      Empowering teams to make objective, data-driven hiring decisions with confidence and speed.
                    </p>
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 backdrop-blur-sm">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </span>
                      All systems operational
                    </span>
                  </div>

                  <div className="flex flex-col gap-4">
                    <h4 className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                      <span className="h-1 w-1 rounded-full bg-sky-500" /> Explore
                    </h4>
                    {navItems.map(item => (
                      <button
                        key={item.href}
                        onClick={() => scrollToAnchor(item.href.slice(1))}
                        className="group flex items-center gap-1.5 text-left text-sm font-light text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400/40 dark:focus-visible:ring-white/20 rounded"
                      >
                        {item.label}
                        <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" />
                      </button>
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
                        className="group flex items-center gap-1.5 text-sm font-light text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                      >
                        {l.label}
                        <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" />
                      </Link>
                    ))}
                  </div>

                  <div className="flex flex-col gap-4">
                    <h4 className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                      <span className="h-1 w-1 rounded-full bg-sky-500" /> Access
                    </h4>
                    {[
                      { label: "Get Started", href: "/auth/register?mode=register" },
                      { label: "Log in", href: "/auth/register?mode=login" },
                    ].map((l) => (
                      <Link
                        key={l.label}
                        href={l.href}
                        className="group flex items-center gap-1.5 text-sm font-light text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                      >
                        {l.label}
                        <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Disciplines strip */}
                <div className="mb-10 flex flex-wrap items-center gap-2 border-t border-slate-200/70 dark:border-white/5 pt-8">
                  <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Built for
                  </span>
                  {disciplines.map((d) => (
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
