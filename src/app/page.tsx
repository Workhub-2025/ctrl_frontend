"use client";

import { LandingHero } from "@/components/landing/landing-hero";
import { PingPongVideoLayer } from "@/components/landing/ping-pong-video-layer";
import { BrandMark } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Gauge,
  Menu,
  ShieldCheck,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const navItems = [
  { label: "Capabilities", href: "#why-ctrl" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "For Teams", href: "#audience" },
  { label: "Platform", href: "#assessments" },
  { label: "Contact", href: "#contact" },
];

const trackedSections = navItems.map((item) => ({
  id: item.href.slice(1),
  label: item.label,
}));

const capabilityPillars = [
  {
    index: "01",
    title: "Decision consistency",
    description:
      "Assess how candidates make decisions, not just whether they land on the correct answer.",
    proof: "Understand reasoning, not just results.",
    icon: Workflow,
  },
  {
    index: "02",
    title: "Pressure-tested performance",
    description:
      "Observe performance as pace changes, information shifts, and operational pressure increases.",
    proof: "Identify composure where it actually matters.",
    icon: Gauge,
  },
  {
    index: "03",
    title: "Signal over noise",
    description:
      "Surface the indicators that support fairer shortlisting instead of relying on generic score sheets.",
    proof: "Give teams clearer, more defensible insights.",
    icon: BadgeCheck,
  },
] as const;

const processSteps = [
  {
    step: "01",
    title: "Set the role standard",
    text:
      "Configure an assessment flow around the communication, judgement, and operational demands of the role.",
    note: "Role-led setup rather than generic testing.",
    icon: BriefcaseBusiness,
  },
  {
    step: "02",
    title: "Assess in context",
    text:
      "Candidates complete a guided journey that reveals performance under pressure and changing conditions.",
    note: "A calmer, clearer experience for applicants.",
    icon: Workflow,
  },
  {
    step: "03",
    title: "Review with confidence",
    text:
      "Hiring teams receive clearer evidence for comparison, shortlist discussion, and final decision-making.",
    note: "Designed for more defensible hiring decisions.",
    icon: ShieldCheck,
  },
] as const;

const audienceGroups = [
  {
    title: "Candidates",
    summary:
      "A more professional first impression with clearer expectations from invitation to completion.",
    points: [
      "Understand what the platform is assessing and why it matters.",
      "Move through a guided journey rather than a faceless test portal.",
      "Experience a process that feels calm, serious, and role-relevant.",
    ],
    icon: Users,
  },
  {
    title: "Recruiters",
    summary:
      "A structured assessment flow that helps teams compare candidates on relevant evidence, not guesswork.",
    points: [
      "Keep the process consistent across applicants.",
      "Review performance through clearer operational signals.",
      "Support shortlist discussions with evidence that is easier to explain.",
    ],
    icon: Workflow,
  },
  {
    title: "Buyers",
    summary:
      "A platform story that stands up commercially, operationally, and under stakeholder scrutiny.",
    points: [
      "Show why generic recruitment tooling is not enough for these roles.",
      "Present a mature, defensible assessment model.",
      "Give stakeholders confidence that the platform supports serious hiring decisions.",
    ],
    icon: BriefcaseBusiness,
  },
] as const;

const workflowStages = [
  {
    label: "Role profile",
    description:
      "Start with the hiring context, communication demands, and decision standards for the role.",
  },
  {
    label: "Assessment flow",
    description:
      "Guide candidates through a structured journey that captures performance across the moments that matter.",
  },
  {
    label: "Review layer",
    description:
      "Bring outputs into one evidence-led view for recruiters, hiring teams, and stakeholders.",
  },
  {
    label: "Shortlist support",
    description:
      "Turn assessment activity into clearer comparison, stronger shortlist discussions, and more confident decisions.",
  },
] as const;

const platformHighlights = [
  {
    title: "Structured workflow",
    text:
      "Create consistency from role setup to final review so the process feels operational rather than improvised.",
    icon: Workflow,
  },
  {
    title: "Assessment clarity",
    text:
      "Combine typing, communication, and judgement into one coherent model instead of three disconnected tests.",
    icon: Gauge,
  },
  {
    title: "Review and reporting",
    text:
      "Surface the evidence teams actually need to compare candidates and explain decisions with confidence.",
    icon: BadgeCheck,
  },
  {
    title: "Candidate journey",
    text:
      "Keep the experience legible and professional so applicants understand the process before the pressure begins.",
    icon: Users,
  },
] as const;

const platformSignals = [
  "Role-specific setup",
  "Guided assessment journey",
  "Evidence-led review",
  "Shortlist support",
] as const;

const closingSignals = [
  "Role-relevant assessment model",
  "Professional candidate experience",
  "Decision-ready recruitment platform",
] as const;

const footerLinks = [
  { label: "Capabilities", href: "#why-ctrl" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Platform", href: "#assessments" },
  { label: "Contact", href: "#contact" },
] as const;

const footerUtilities = [
  { label: "Sign in", href: "/auth/login" },
  { label: "Request access", href: "/auth/register" },
  { label: "Privacy policy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms-conditions" },
] as const;

function ScrollReveal({
  children,
  className,
  delay = 0,
  y = 28,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? false : { opacity: 0, y }}
      whileInView={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  invert = false,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  invert?: boolean;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
      <div
        className={`text-[0.72rem] font-semibold uppercase tracking-[0.32em] ${
          invert ? "text-sky-200/80" : "text-sky-700 dark:text-sky-200"
        }`}
      >
        {eyebrow}
      </div>
      <h2
        className={`mt-4 text-[clamp(2.2rem,4.4vw,4rem)] font-semibold leading-[0.95] tracking-[-0.06em] ${
          invert ? "text-white" : "text-slate-950 dark:text-white"
        }`}
      >
        {title}
      </h2>
      <p
        className={`mt-4 text-[1rem] leading-8 ${
          centered ? "mx-auto max-w-2xl" : "max-w-xl"
        } ${invert ? "text-white/74" : "text-slate-600 dark:text-slate-300"}`}
      >
        {body}
      </p>
    </div>
  );
}

function scrollToLandingAnchor(id: string) {
  const target = document.getElementById(id);
  const nav = document.querySelector("nav");

  if (!target) {
    return;
  }

  const navHeight =
    nav instanceof HTMLElement ? nav.getBoundingClientRect().height : 0;
  const isContactSection = id === "contact";
  const extraOffset = window.innerWidth >= 1024 ? 28 : 18;
  const top = isContactSection
    ? target.getBoundingClientRect().top + window.scrollY
    : target.getBoundingClientRect().top +
      window.scrollY -
      navHeight -
      extraOffset;

  window.scrollTo({
    top: Math.max(0, top),
    behavior: "smooth",
  });

  window.history.replaceState(null, "", `#${id}`);
}

function scrollToHero() {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });

  window.history.replaceState(null, "", "#landing-hero");
}

export default function Home() {
  const navRef = useRef<HTMLElement | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(trackedSections[0].id);
  const [isHeroMode, setIsHeroMode] = useState(true);
  const [navHeight, setNavHeight] = useState(96);

  useEffect(() => {
    document.documentElement.classList.add("landing-scroll-snap");
    document.body.classList.add("landing-scroll-snap");

    return () => {
      document.documentElement.classList.remove("landing-scroll-snap");
      document.body.classList.remove("landing-scroll-snap");
    };
  }, []);

  useEffect(() => {
    const nav = navRef.current;

    if (!nav) {
      return;
    }

    const updateNavHeight = () => {
      setNavHeight(Math.round(nav.getBoundingClientRect().height));
    };

    updateNavHeight();

    const observer = new ResizeObserver(updateNavHeight);
    observer.observe(nav);
    window.addEventListener("resize", updateNavHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateNavHeight);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (isMobileMenuOpen && window.scrollY > 48) {
        setIsMobileMenuOpen(false);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const heroElement = document.getElementById("landing-hero");
    const sectionElements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-scene]")
    );

    if (!heroElement || !sectionElements.length) {
      return;
    }

    const heroObserver = new IntersectionObserver(
      (entries) => {
        const heroEntry = entries[0];

        if (!heroEntry) {
          return;
        }

        setIsHeroMode(
          heroEntry.isIntersecting && heroEntry.intersectionRatio > 0.28
        );
      },
      {
        threshold: [0.15, 0.28, 0.5, 0.75],
      }
    );

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleEntries[0]) {
          const target = visibleEntries[0].target as HTMLElement;

          setActiveSection(target.id || target.dataset.scene || trackedSections[0].id);
        }
      },
      {
        threshold: [0.26, 0.45, 0.68],
        rootMargin: "-18% 0px -22% 0px",
      }
    );

    heroObserver.observe(heroElement);
    sectionElements.forEach((section) => sectionObserver.observe(section));

    return () => {
      heroObserver.disconnect();
      sectionObserver.disconnect();
    };
  }, []);

  return (
    <div
      className="landing-shell relative overflow-x-hidden text-slate-900 dark:text-white"
      style={{ fontFamily: "Poppins, Inter, sans-serif" }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[74rem] bg-[radial-gradient(circle_at_18%_14%,rgba(24,111,224,0.22),transparent_18%),radial-gradient(circle_at_82%_18%,rgba(63,221,255,0.12),transparent_16%),linear-gradient(180deg,#03060a_0%,#04070d_42%,rgba(4,7,13,0.74)_76%,transparent_100%)]" />
        <div className="absolute inset-x-0 top-0 h-[54rem] opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:92px_92px]" />
      </div>

      <nav
        ref={navRef}
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-500 ${
          isHeroMode ? "" : "px-4 pt-[max(env(safe-area-inset-top),0.9rem)] sm:px-6 lg:px-8"
        }`}
      >
        <div
          className={`flex items-center justify-between backdrop-blur-2xl transition-all duration-500 ${
            isHeroMode
              ? "border-b border-white/10 bg-[linear-gradient(180deg,rgba(4,7,13,0.78),rgba(4,7,13,0.36))] px-5 py-[calc(max(env(safe-area-inset-top),0.9rem)+0.85rem)] sm:px-6 lg:px-8"
              : "mx-auto max-w-[1260px] rounded-full border border-white/12 bg-black/78 px-5 py-3.5 shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
          }`}
        >
          <Link
            href="#landing-hero"
            onClick={(event) => {
              event.preventDefault();
              scrollToHero();
            }}
            className="flex min-w-0 items-center gap-3"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <BrandMark className="w-7 text-white/85" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-white">
                CTRL
              </div>
              <div className="hidden text-sm text-white/74 sm:block">
                Recruitment intelligence
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-6 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(event) => {
                  event.preventDefault();
                  scrollToLandingAnchor(item.href.slice(1));
                }}
                className={`text-sm font-medium transition-colors ${
                  !isHeroMode && activeSection === item.href.slice(1)
                    ? "text-cyan-200"
                    : "text-white/80 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              Sign in
            </Link>
            <Button
              asChild
              className="h-11 rounded-full border border-cyan-300/16 bg-[linear-gradient(135deg,rgba(58,217,255,0.22),rgba(255,255,255,0.08))] px-5 text-white shadow-[0_18px_40px_rgba(8,116,153,0.28)] hover:bg-[linear-gradient(135deg,rgba(58,217,255,0.28),rgba(255,255,255,0.1))]"
            >
              <Link href="/auth/register">Request access</Link>
            </Button>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70"
              aria-label="Toggle navigation"
              aria-expanded={isMobileMenuOpen}
              type="button"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="mx-auto mt-3 max-w-[1320px] rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,10,17,0.92),rgba(7,10,17,0.82))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.44)] backdrop-blur-2xl lg:hidden">
            <div className="flex flex-col gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(event) => {
                    event.preventDefault();
                    setIsMobileMenuOpen(false);
                    scrollToLandingAnchor(item.href.slice(1));
                  }}
                  className="rounded-2xl px-4 py-3 text-sm font-medium text-white/72 transition hover:bg-white/[0.06] hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
              <div className="h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
              <Link
                href="/auth/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm font-medium text-white/72 transition hover:bg-white/[0.06] hover:text-white"
              >
                Sign in
              </Link>
              <Button
                asChild
                className="h-11 rounded-full border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(58,217,255,0.22),rgba(255,255,255,0.08))] text-white hover:bg-[linear-gradient(135deg,rgba(58,217,255,0.28),rgba(255,255,255,0.1))]"
              >
                <Link
                  href="/auth/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Request access
                </Link>
              </Button>
            </div>
          </div>
        )}
      </nav>

      <main className="relative z-10">
        <LandingHero navHeight={navHeight} />

        <section className="relative px-4 pb-10 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#04070d] via-[#04070d]/82 to-transparent sm:h-32" />

          <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
            <section
              id="why-ctrl"
              data-scene="why-ctrl"
              className="landing-anchor-target overflow-hidden rounded-[2.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,17,29,0.98),rgba(6,13,23,0.96))] px-6 py-10 shadow-[0_28px_80px_rgba(0,0,0,0.32)] sm:px-8 sm:py-12 lg:px-10 lg:py-14"
            >
              <div className="grid gap-10 xl:grid-cols-[0.92fr_1.08fr]">
                <ScrollReveal>
                  <SectionHeading
                    eyebrow="Core capabilities"
                    title="A recruitment model built for roles where judgement has to hold under pressure."
                    body="CTRL replaces generic screening with structured, role-relevant assessment. The goal is clearer evidence for hiring teams and a more credible experience for candidates."
                    invert
                  />

                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    {[
                      "High-pressure role fit",
                      "Clearer candidate comparison",
                      "More defensible hiring decisions",
                    ].map((item, index) => (
                      <div
                        key={item}
                        className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm font-medium text-white/76"
                        style={{ transitionDelay: `${index * 40}ms` }}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </ScrollReveal>

                <div className="grid gap-4 lg:grid-cols-3">
                  {capabilityPillars.map((pillar, index) => {
                    const Icon = pillar.icon;

                    return (
                      <ScrollReveal
                        key={pillar.title}
                        delay={index * 0.06}
                        className="h-full"
                      >
                        <article className="flex h-full flex-col rounded-[2rem] border border-white/10 bg-white/[0.05] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold tracking-[0.28em] text-white/45">
                              {pillar.index}
                            </div>
                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-cyan-200">
                              <Icon className="h-4 w-4" />
                            </span>
                          </div>
                          <h3 className="mt-6 text-2xl font-semibold leading-tight text-white">
                            {pillar.title}
                          </h3>
                          <p className="mt-4 text-sm leading-7 text-white/70">
                            {pillar.description}
                          </p>
                          <div className="mt-auto pt-6">
                            <div className="rounded-[1.35rem] border border-cyan-400/14 bg-cyan-300/[0.06] px-4 py-4 text-sm leading-6 text-cyan-100/88">
                              {pillar.proof}
                            </div>
                          </div>
                        </article>
                      </ScrollReveal>
                    );
                  })}
                </div>
              </div>
            </section>

            <section
              id="how-it-works"
              data-scene="how-it-works"
              className="landing-anchor-target overflow-hidden rounded-[2.75rem] border border-white/60 bg-white/82 px-6 py-10 shadow-[0_26px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0f1726]/78 dark:shadow-[0_28px_80px_rgba(2,6,23,0.34)] sm:px-8 sm:py-12 lg:px-10 lg:py-14"
            >
              <div className="grid gap-8 xl:grid-cols-[0.84fr_1.16fr] xl:items-start">
                <ScrollReveal>
                  <SectionHeading
                    eyebrow="How it works"
                    title="A structured assessment flow that stays easy to understand."
                    body="Candidates complete a guided journey, relevant performance is observed in context, and teams review clearer evidence for shortlist decisions."
                  />

                  <div className="mt-8 rounded-[2rem] border border-slate-200/80 bg-slate-950 px-5 py-5 text-white shadow-[0_22px_56px_rgba(15,23,42,0.22)] dark:border-white/10">
                    <div className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-cyan-200/76">
                      What teams receive
                    </div>
                    <div className="mt-4 space-y-3">
                      {[
                        "A consistent workflow across candidates.",
                        "Evidence that is easier to compare and explain.",
                        "A clearer line from assessment activity to shortlist decisions.",
                      ].map((item) => (
                        <div
                          key={item}
                          className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white/74"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>

                <div className="grid gap-4 lg:grid-cols-3">
                  {processSteps.map((step, index) => {
                    const Icon = step.icon;

                    return (
                      <ScrollReveal
                        key={step.title}
                        delay={index * 0.06}
                        className="h-full"
                      >
                        <article className="flex h-full flex-col rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.04]">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold tracking-[0.28em] text-sky-700 dark:text-sky-200">
                              {step.step}
                            </div>
                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
                              <Icon className="h-4 w-4" />
                            </span>
                          </div>
                          <h3 className="mt-6 text-2xl font-semibold leading-tight text-slate-950 dark:text-white">
                            {step.title}
                          </h3>
                          <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                            {step.text}
                          </p>
                          <div className="mt-auto pt-6 text-sm font-medium text-slate-500 dark:text-slate-400">
                            {step.note}
                          </div>
                        </article>
                      </ScrollReveal>
                    );
                  })}
                </div>
              </div>
            </section>

            <section
              id="audience"
              data-scene="audience"
              className="landing-anchor-target overflow-hidden rounded-[2.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(9,18,30,0.98),rgba(8,14,24,0.96))] px-6 py-10 shadow-[0_26px_70px_rgba(0,0,0,0.28)] sm:px-8 sm:py-12 lg:px-10 lg:py-14"
            >
              <ScrollReveal>
                <SectionHeading
                  eyebrow="Audience value"
                  title="Built for the people making the decision and the people moving through it."
                  body="CTRL has to work for three groups at once: candidates completing the process, recruiters reviewing the evidence, and stakeholders evaluating whether the platform is strong enough to adopt."
                  invert
                  centered
                />
              </ScrollReveal>

              <div className="mt-8 grid gap-4 xl:grid-cols-3">
                {audienceGroups.map((group, index) => {
                  const Icon = group.icon;

                  return (
                    <ScrollReveal
                      key={group.title}
                      delay={index * 0.06}
                      className="h-full"
                    >
                      <article className="flex h-full flex-col rounded-[2rem] border border-white/10 bg-white/[0.05] p-5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-cyan-200">
                            <Icon className="h-5 w-5" />
                          </span>
                          <h3 className="text-2xl font-semibold text-white">
                            {group.title}
                          </h3>
                        </div>
                        <p className="mt-5 text-sm leading-7 text-white/72">
                          {group.summary}
                        </p>
                        <div className="mt-6 space-y-3">
                          {group.points.map((point) => (
                            <div
                              key={point}
                              className="rounded-[1.2rem] border border-white/10 bg-black/10 px-4 py-3 text-sm leading-6 text-white/72"
                            >
                              {point}
                            </div>
                          ))}
                        </div>
                      </article>
                    </ScrollReveal>
                  );
                })}
              </div>
            </section>

            <section
              id="assessments"
              data-scene="assessments"
              className="landing-anchor-target overflow-hidden rounded-[2.75rem] border border-white/60 bg-white/82 px-6 py-10 shadow-[0_26px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0f1726]/78 dark:shadow-[0_28px_80px_rgba(2,6,23,0.34)] sm:px-8 sm:py-12 lg:px-10 lg:py-14"
            >
              <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
                <ScrollReveal>
                  <SectionHeading
                    eyebrow="Platform detail"
                    title="Make the platform feel real, structured, and ready to support serious hiring."
                    body="Below the surface, CTRL should read like a robust operational workflow: role setup, guided assessment, evidence review, and shortlist support."
                  />

                  <div className="mt-8 rounded-[2rem] border border-white/10 bg-slate-950 px-5 py-5 text-white shadow-[0_22px_56px_rgba(15,23,42,0.22)] dark:border-white/10">
                    <div className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-cyan-200/76">
                      Platform workflow
                    </div>

                    <div className="mt-6 space-y-4">
                      {workflowStages.map((stage, index) => (
                        <div
                          key={stage.label}
                          className="relative rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-4 py-4"
                        >
                          {index < workflowStages.length - 1 ? (
                            <div className="pointer-events-none absolute bottom-[-1rem] left-6 top-auto h-4 w-px bg-gradient-to-b from-cyan-300/45 to-transparent" />
                          ) : null}
                          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-100/60">
                            {stage.label}
                          </div>
                          <div className="mt-2 text-sm leading-7 text-white/74">
                            {stage.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>

                <div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {platformHighlights.map((item, index) => {
                      const Icon = item.icon;

                      return (
                        <ScrollReveal
                          key={item.title}
                          delay={index * 0.06}
                          className="h-full"
                        >
                          <article className="flex h-full flex-col rounded-[1.9rem] border border-slate-200/80 bg-white/92 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.04]">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
                              <Icon className="h-4 w-4" />
                            </span>
                            <h3 className="mt-5 text-2xl font-semibold leading-tight text-slate-950 dark:text-white">
                              {item.title}
                            </h3>
                            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                              {item.text}
                            </p>
                          </article>
                        </ScrollReveal>
                      );
                    })}
                  </div>

                  <ScrollReveal className="mt-6">
                    <div className="rounded-[2rem] border border-slate-200/80 bg-slate-50/90 p-5 dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-sky-700 dark:text-sky-200">
                        What this should signal
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {platformSignals.map((signal) => (
                          <div
                            key={signal}
                            className="rounded-[1.2rem] border border-slate-200/75 bg-white/88 px-4 py-3 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-black/10 dark:text-slate-200"
                          >
                            {signal}
                          </div>
                        ))}
                      </div>
                    </div>
                  </ScrollReveal>
                </div>
              </div>
            </section>

          </div>
        </section>
        <section
          id="contact"
          data-scene="contact"
          className="landing-anchor-target landing-snap-start relative isolate min-h-[100svh] overflow-hidden border-y border-white/10 bg-[#04070d] supports-[height:100dvh]:min-h-[100dvh]"
          style={{ scrollMarginTop: 0 }}
        >
          <div className="pointer-events-none absolute inset-0">
            <PingPongVideoLayer
              crop={{
                desktop: { x: 0.68, y: 0.54, scale: 1.14 },
                tablet: { x: 0.64, y: 0.54, scale: 1.2 },
                mobile: { x: 0.5, y: 0.42, scale: 1.1 },
              }}
              mobilePosterSrc="/assets/landing-closer/footer-closer-poster.png"
              mobileReverseSrc="/assets/landing-closer/footer-closer-reverse.mp4"
              mobileSrc="/assets/landing-closer/footer-closer.mp4"
              posterSrc="/assets/landing-closer/contact-closer-poster.png"
              priority
              reverseSrc="/assets/landing-closer/contact-closer-reverse.mp4"
              src="/assets/landing-closer/contact-closer.mp4"
            />
            <div className="contact-media-vignette absolute inset-0" />
            <div className="contact-media-bloom absolute inset-0" />
            <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:112px_112px]" />
            <div className="hero-media-top-fade absolute inset-x-0 top-0 h-32 sm:h-40" />
            <div className="hero-media-bottom-fade absolute inset-x-0 bottom-0 h-44 sm:h-56" />
          </div>

          <div
            className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1320px] flex-col px-4 supports-[height:100dvh]:min-h-[100dvh] sm:px-6 lg:px-8"
            style={{
              paddingTop: `max(calc(${navHeight}px + 2.5rem), 6rem)`,
              paddingBottom: "max(env(safe-area-inset-bottom), 1.5rem)",
            }}
          >
            <div className="grid flex-1 items-end gap-10 py-10 xl:grid-cols-[0.94fr_1.06fr] xl:gap-14">
              <ScrollReveal>
                <div className="max-w-[40rem]">
                  <div className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-cyan-200/76">
                    Contact CTRL
                  </div>
                  <h2 className="mt-5 max-w-[12ch] text-[clamp(2.9rem,6vw,5.9rem)] font-semibold leading-[0.92] tracking-[-0.07em] text-white">
                    Move from generic testing to a clearer hiring system.
                  </h2>
                  <p className="mt-5 max-w-[33rem] text-[1.02rem] leading-8 text-white/80 sm:text-[1.08rem]">
                    Give candidates a more professional journey and give hiring
                    teams the evidence they need to compare, shortlist, and
                    defend decisions with confidence.
                  </p>

                  <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                    <Button
                      asChild
                      className="h-12 rounded-full border border-cyan-300/16 bg-[linear-gradient(135deg,rgba(58,217,255,0.22),rgba(255,255,255,0.08))] px-6 text-white shadow-[0_18px_40px_rgba(8,116,153,0.28)] hover:bg-[linear-gradient(135deg,rgba(58,217,255,0.28),rgba(255,255,255,0.1))]"
                    >
                      <Link href="/auth/register">
                        Request access
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => scrollToLandingAnchor("why-ctrl")}
                      className="h-12 rounded-full border border-white/18 bg-white/[0.06] px-6 text-white hover:bg-white/[0.1] hover:text-white"
                    >
                      Explore the platform
                    </Button>
                  </div>
                </div>
              </ScrollReveal>

              <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                {closingSignals.map((signal, index) => (
                  <ScrollReveal
                    key={signal}
                    delay={index * 0.06}
                    className="h-full"
                  >
                    <div className="flex h-full min-h-[10rem] flex-col justify-between rounded-[2rem] border border-white/14 bg-black/28 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-cyan-100/72">
                        {`0${index + 1}`}
                      </div>
                      <div className="max-w-[14rem] text-lg font-medium leading-8 text-white">
                        {signal}
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="relative isolate overflow-hidden border-t border-white/10 bg-[#020408]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(56,189,248,0.12),transparent_20%),radial-gradient(circle_at_82%_16%,rgba(244,114,182,0.08),transparent_18%),linear-gradient(180deg,#020408_0%,#06101a_100%)]" />
            <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:108px_108px]" />
          </div>

          <div className="relative z-10 mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <ScrollReveal>
                <div className="max-w-[40rem]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]">
                      <BrandMark className="w-7 text-white/90" />
                    </span>
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.28em] text-white">
                        CTRL
                      </div>
                      <div className="text-sm text-white/64">
                        Recruitment intelligence
                      </div>
                    </div>
                  </div>

                  <h2 className="mt-8 max-w-[14ch] text-[clamp(2.4rem,4.8vw,4.8rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-white">
                    Recruitment intelligence that stays composed under pressure.
                  </h2>
                  <p className="mt-5 max-w-[34rem] text-base leading-8 text-white/72 sm:text-[1.05rem]">
                    CTRL helps serious hiring teams move from assessment activity
                    to clearer evidence, stronger shortlist conversations, and a
                    more professional candidate experience.
                  </p>
                </div>
              </ScrollReveal>

              <div className="grid gap-4 sm:grid-cols-2">
                <ScrollReveal delay={0.06}>
                  <div className="rounded-[2rem] border border-white/10 bg-black/24 p-6 backdrop-blur-xl">
                    <div className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-cyan-100/68">
                      Explore
                    </div>
                    <div className="mt-5 space-y-4">
                      {footerLinks.map((item) => (
                        <button
                          key={item.href}
                          type="button"
                          onClick={() => scrollToLandingAnchor(item.href.slice(1))}
                          className="block text-left text-base font-medium text-white/76 transition hover:text-white"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>

                <ScrollReveal delay={0.12}>
                  <div className="rounded-[2rem] border border-white/10 bg-black/24 p-6 backdrop-blur-xl">
                    <div className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-cyan-100/68">
                      Access
                    </div>
                    <div className="mt-5 space-y-4">
                      {footerUtilities.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block text-base font-medium text-white/76 transition hover:text-white"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            </div>

            <div className="mt-10 border-t border-white/10 py-5 text-sm text-white/56 sm:py-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>&copy; {new Date().getFullYear()} CTRL Assessment Platform.</div>
                <div className="flex items-center gap-2 text-white/62">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  <div>Built for high-stakes recruitment decisions.</div>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
