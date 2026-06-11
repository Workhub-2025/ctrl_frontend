"use client";

import { LandingHero } from "@/components/landing/landing-hero";
import { BrandLogo, BrandMark, CtrlText } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Activity,
  PhoneCall,
  Menu,
  ShieldCheck,
  Crosshair,
  X,
  Stethoscope,
  BarChart3,
  Flame,
  Radio,
  CheckCircle2,
} from "lucide-react";
import { motion, useReducedMotion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { AccessibilityDropdown } from "@/components/accessibility/accessibility-dropdown";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";

const navItems = [
  { label: "For Agencies", href: "#workflow" },
  { label: "For Candidates", href: "#candidate-experience" },
  { label: "Disciplines", href: "#solutions" },
];

const hiringWorkflowSteps = [
  {
    step: "01",
    title: "Define What Good Looks Like",
    text: "Start by identifying the skills, behaviours and operational standards that matter most to your organisation. CTRL then evaluates candidates against these criteria, creating a consistent and evidence-based recruitment process.",
    icon: Crosshair,
  },
  {
    step: "02",
    title: "Simulate the Environment",
    text: "CTRL recreates realistic operational environments where candidates must manage information, prioritise competing demands and make decisions in real time. By observing performance in context, organisations gain deeper insight into who is most likely to succeed in role.",
    icon: Radio,
  },
  {
    step: "03",
    title: "Hire with Confidence.",
    text: "Review assessment results, compare candidate performance and identify those best suited to the demands of the role. CTRL provides a structured and objective foundation for more informed recruitment decisions.",
    icon: BarChart3,
  },
  {
    step: "04",
    title: "Train with Purpose.",
    text: "CTRL helps organisations identify candidates with the skills, judgement and potential to succeed in demanding operational environments, enabling more informed recruitment decisions before investment in training begins.",
    icon: ShieldCheck,
  },
];

const candidateWorkflowSteps = [
  {
    step: "01",
    title: "Enter the Assessment Experience",
    text: "Complete a series of carefully designed assessments that measure the skills and behaviours required for success in high-pressure operational roles.",
    icon: Activity,
  },
  {
    step: "02",
    title: "Take on Realistic Scenarios",
    text: "Navigate interactive call simulations and decision-making exercises that reflect the challenges faced by operational teams every day.",
    icon: PhoneCall,
  },
  {
    step: "03",
    title: "Demonstrate Performance Under Pressure",
    text: "Show how you communicate, prioritise information and make decisions when faced with realistic demands and competing priorities.",
    icon: ShieldCheck,
  },
  {
    step: "04",
    title: "Unlock New Opportunities",
    text: "Help organisations gain a clearer understanding of your strengths, potential and suitability for roles where performance matters most.",
    icon: CheckCircle2,
  },
];

function ScrollReveal({
  children,
  className,
  delay = 0,
  y = 24,
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
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  centered = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  body: React.ReactNode;
  centered?: boolean;
}) {
  return (
    <ScrollReveal y={20}>
      <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 font-mono">
          {eyebrow}
        </div>
        <h2 className="mt-4 text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight text-white text-balance font-display">
          {title}
        </h2>
        <p className={cn("mt-6 text-lg leading-relaxed text-slate-400 font-light", centered && "mx-auto")}>
          {body}
        </p>
      </div>
    </ScrollReveal>
  );
}

function SectionDivider() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative w-full h-32 md:h-48 flex items-center justify-center overflow-hidden opacity-60 my-8 md:my-16">
      <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-white/10 to-transparent" />
      <motion.div
        className="absolute w-[2px] h-20 bg-gradient-to-b from-transparent via-white to-transparent blur-[1px]"
        animate={shouldReduceMotion ? {} : { y: [-150, 150] }}
        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
      />
    </div>
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

export default function Home() {
  const navRef = useRef<HTMLElement | null>(null);
  const hiringRef = useRef<HTMLElement | null>(null);
  const candidateRef = useRef<HTMLElement | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [navHeight, setNavHeight] = useState(96);
  const [scrolled, setScrolled] = useState(false);
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
    const nav = navRef.current;
    if (!nav) return;
    const updateNavHeight = () => setNavHeight(Math.round(nav.getBoundingClientRect().height));
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

  return (
    <div className={cn(bgColor, "ctrl-landing-page selection:bg-white/20 font-sans min-h-screen transition-colors duration-500")}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-full focus:font-bold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary">
        Skip to content
      </a>
      <nav
        ref={navRef}
        className="fixed top-4 inset-x-0 mx-auto w-full max-w-[1200px] px-4 sm:px-6 z-50 transition-[max-width,padding,top] duration-500"
      >
        <div className={cn(
          "flex items-center justify-between rounded-full border transition-[background-color,border-color,padding,box-shadow] duration-500 px-6",
          scrolled 
            ? "bg-[#0a0a0a]/90 backdrop-blur-md border-white/10 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)]" 
            : "bg-transparent border-transparent py-4"
        )}>
          {/* Logo */}
          <Link href="/" className="flex items-center group relative z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20">
            <BrandLogo className="w-24 sm:w-28 transition-opacity group-hover:opacity-80" />
          </Link>

          {/* Links (Desktop) */}
          <div className="hidden lg:flex items-center gap-8 text-sm font-medium absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => scrollToAnchor(item.href.slice(1))}
                className="text-slate-400 hover:text-white transition-colors relative after:absolute after:-bottom-1 after:left-0 after:w-full after:h-[2px] after:bg-white after:scale-x-0 after:transition-transform hover:after:scale-x-100 after:origin-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded px-1.5 py-0.5"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* CTA (Desktop) */}
          <div className="hidden lg:flex items-center gap-4 relative z-10">
            <AccessibilityDropdown
              settings={accessibilitySettings}
              updateSettings={updateAccessibilitySettings}
              resetSettings={resetAccessibilitySettings}
            />
            <Link href="/auth/register?mode=login" className="group flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white transition-[background-color,color] px-3 py-1.5 rounded-full hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20">
              Log in
              <ArrowRight className="w-3.5 h-3.5 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" aria-hidden="true" />
            </Link>
            <Button asChild className="group rounded-full bg-white text-black hover:bg-slate-200 h-9 px-5 font-medium transition-colors text-sm focus-visible:ring-2 focus-visible:ring-white/50">
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
              className="text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 rounded-lg p-1"
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
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-[calc(100%+16px)] left-4 right-4 sm:left-6 sm:right-6 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 flex flex-col gap-6 lg:hidden shadow-2xl origin-top"
            >
              <div className="flex flex-col gap-4">
                {navItems.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => {
                      scrollToAnchor(item.href.slice(1));
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-left text-lg font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <hr className="border-white/10 my-1" />
              <div className="flex flex-col gap-3">
                <Link href="/auth/register?mode=login" className="group w-full flex items-center justify-center gap-2 text-base font-medium text-slate-300 hover:text-white transition-[background-color,color] py-3 rounded-full hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20">
                  Log in
                  <ArrowRight className="w-4 h-4 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" aria-hidden="true" />
                </Link>
                <Button asChild className="rounded-full bg-white text-black w-full h-12 text-base font-medium focus-visible:ring-2 focus-visible:ring-white/50">
                  <Link href="/auth/register?mode=register">Get Started</Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main id="main-content" className="relative z-10">
        <LandingHero navHeight={navHeight} bgColor={bgColor} reduceMotion={reduceMotion} />

        <div className="relative px-6 py-24 md:py-32 flex flex-col overflow-hidden w-full max-w-[1440px] mx-auto">
          
          {/* Narrative Capabilities Section */}
          <section id="capabilities" className="w-full">
            <div className="text-center max-w-3xl mx-auto mb-16">
               <SectionHeading
                  eyebrow="Core Engine"
                  title="Assess Skills. Simulate Reality."
                  body={<><CtrlText /> combines proven recruitment assessments with immersive call simulation technology, providing a more complete picture of candidate suitability. Beyond measuring individual skills, <CtrlText /> reveals how candidates apply them in realistic operational scenarios where pressure, judgement and decision-making matter most.</>}
                  centered
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {/* Card 1 - Full Width */}
              <ScrollReveal delay={0.1} className="md:col-span-2 relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0a] p-8 md:p-12 group">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                  <div className="flex-1">
                    <div className="h-12 w-12 rounded-full border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center mb-6">
                      <PhoneCall className="h-5 w-5 text-cyan-400" aria-hidden="true" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-medium text-white mb-4 text-balance font-display">See Beyond the Candidate. See the Future Employee.</h3>
                    <p className="text-slate-400 font-light leading-relaxed">
                      CTRL's Call Simulation Assessment recreates realistic operational scenarios that require candidates to think, prioritise and respond in real time. The result is deeper behavioural insight and greater confidence in every recruitment decision.
                    </p>
                  </div>
                  <div className="flex-1 w-full relative aspect-[4/3] md:aspect-auto md:h-64 rounded-2xl border border-white/5 bg-[#050505] overflow-hidden flex items-center justify-center shadow-inner">
                     <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,rgba(16,185,129,0.05)_50%,transparent_100%)] opacity-50" />
                     {/* Visual Mockup for Audio/Call */}
                     <div className="flex items-center gap-1.5 relative z-10">
                       {[24, 42, 28, 55, 32, 48, 20, 45, 30, 50, 22, 38].map((peak, i) => (
                         <motion.div
                           key={i}
                           className="w-1.5 bg-cyan-500/50 rounded-full"
                           animate={reduceMotion ? {} : { height: ["12px", `${peak}px`, "12px"] }}
                           transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.1, ease: "easeInOut" }}
                         />
                       ))}
                     </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Card 2 */}
              <ScrollReveal delay={0.2} className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0a] p-8 group flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="h-12 w-12 rounded-full border border-blue-500/20 bg-blue-500/10 flex items-center justify-center mb-6 relative z-10">
                  <Activity className="h-5 w-5 text-blue-400" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-medium text-white mb-3 relative z-10 text-balance font-display">Understanding Performance Beyond the Interview</h3>
                <p className="text-slate-400 font-light leading-relaxed mb-8 flex-1 relative z-10">
                  CTRL assesses how candidates process information, adapt to changing circumstances and make decisions under pressure, delivering behavioural insight that traditional recruitment methods often fail to uncover.
                </p>
                <div className="w-full h-32 rounded-xl border border-white/5 bg-[#050505] overflow-hidden relative flex items-end p-4">
                   {/* Visual Mockup for Chart/Stress */}
                   <div className="w-full flex items-end gap-2 h-full opacity-80">
                     {[40, 65, 45, 80, 55, 90, 75].map((h, i) => (
                       <motion.div
                         key={i}
                         initial={{ height: "0%" }}
                         animate={reduceMotion ? { height: `${h}%` } : {}}
                         whileInView={reduceMotion ? {} : { height: `${h}%` }}
                         viewport={{ once: true }}
                         transition={reduceMotion ? { duration: 0 } : { duration: 1, delay: 0.2 + i * 0.1 }}
                         className="flex-1 bg-gradient-to-t from-blue-500/10 to-blue-500/30 rounded-t-sm border-t border-blue-500/50"
                       />
                     ))}
                   </div>
                </div>
              </ScrollReveal>

              {/* Card 3 */}
              <ScrollReveal delay={0.3} className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0a] p-8 group flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="h-12 w-12 rounded-full border border-purple-500/20 bg-purple-500/10 flex items-center justify-center mb-6 relative z-10">
                  <ShieldCheck className="h-5 w-5 text-purple-400" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-medium text-white mb-3 relative z-10 text-balance font-display">Recruit with Evidence. Decide with Confidence.</h3>
                <p className="text-slate-400 font-light leading-relaxed mb-8 flex-1 relative z-10">
                  CTRL combines objective assessment data with realistic performance insight, helping organisations make fairer, more informed recruitment decisions while reducing risk and increasing confidence in candidate selection.
                </p>
                <div className="w-full h-32 rounded-xl border border-white/5 bg-[#050505] overflow-hidden relative flex items-center justify-center p-6">
                   {/* Visual Mockup for Shield/Data */}
                   <div className="w-full space-y-3">
                     {[85, 70, 95].map((w, i) => (
                       <div key={i} className="flex items-center gap-3">
                         <div className="h-2 w-2 rounded-full bg-purple-500/50" />
                         <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                             <motion.div
                               initial={{ width: "0%" }}
                               animate={reduceMotion ? { width: `${w}%` } : {}}
                               whileInView={reduceMotion ? {} : { width: `${w}%` }}
                               viewport={{ once: true }}
                               transition={reduceMotion ? { duration: 0 } : { duration: 1, delay: 0.4 + i * 0.2 }}
                               className="h-full bg-purple-500/40 rounded-full"
                             />
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              </ScrollReveal>
            </div>
          </section>

          <SectionDivider />

          {/* Hiring Workflow Section */}
          <section id="workflow" ref={hiringRef} className="w-full">
            <div className="text-center mb-16 max-w-3xl mx-auto">
               <SectionHeading 
                  eyebrow="For Hiring Teams" 
                  title="Build Stronger Talent Pipelines with Confidence" 
                  body="CTRL helps organisations identify high-potential candidates earlier in the recruitment process, using behavioural insight and realistic performance data to support smarter, more informed hiring decisions." 
                  centered 
               />
            </div>
            <div className="relative max-w-5xl mx-auto py-8">
              <div className="absolute left-[39px] md:left-1/2 top-0 bottom-0 w-px bg-white/5 md:-translate-x-1/2" />
              <motion.div 
                 className="absolute left-[39px] md:left-1/2 top-0 w-px bg-gradient-to-b from-transparent via-white to-white md:-translate-x-1/2 shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                 style={{ height: hiringHeight, transformOrigin: "top" }} 
              />
              
              <div className="space-y-24 md:space-y-32 relative z-10">
                {hiringWorkflowSteps.map((step, i) => (
                  <div key={step.title} className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 md:gap-16 items-start md:items-center relative">
                    <div className={cn("pl-20 md:pl-0", i % 2 === 0 ? "md:text-right md:col-start-1 md:row-start-1" : "md:col-start-3 md:text-left md:row-start-1")}>
                      <ScrollReveal>
                        <div className="text-xs font-mono text-slate-500 mb-3">{step.step} {"//"}</div>
                        <h4 className="text-2xl md:text-3xl font-medium text-white mb-3 text-balance font-display">{step.title}</h4>
                        <p className="text-lg text-slate-400 font-light leading-relaxed">{step.text}</p>
                      </ScrollReveal>
                    </div>
                    <div className="absolute left-[15px] md:static md:col-start-2 md:row-start-1 top-2 md:top-auto w-12 h-12 rounded-full border border-white/20 bg-[#0a0a0a] flex items-center justify-center z-20 shadow-[0_0_20px_rgba(0,0,0,0.8)] mt-2 md:mt-0">
                      <step.icon className="h-5 w-5 text-white/80" aria-hidden="true" />
                    </div>
                    <div className={cn("pl-20 md:pl-0 w-full", i % 2 === 0 ? "md:col-start-3 md:row-start-1" : "md:col-start-1 md:row-start-1")}>
                      <ScrollReveal delay={0.1}>
                        <div className="w-full aspect-video rounded-xl border border-white/10 bg-white/5 flex flex-col items-center justify-center text-slate-500 text-sm overflow-hidden relative group">
                           <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent pointer-events-none" />
                           <div className="h-10 w-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center mb-3">
                             <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-white/50 ml-1" />
                           </div>
                           <span>Media Placeholder</span>
                        </div>
                      </ScrollReveal>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <SectionDivider />

          {/* Candidate Workflow Section */}
          <section id="candidate-experience" ref={candidateRef} className="w-full">
            <div className="text-center mb-16 max-w-3xl mx-auto">
               <SectionHeading 
                  eyebrow="For Candidates" 
                  title="Where Capability Speaks for Itself" 
                  body="Show how you think, respond and perform when faced with realistic operational challenges, helping organisations see your potential with greater clarity and confidence." 
                  centered 
               />
            </div>
            <div className="relative max-w-5xl mx-auto py-8">
              <div className="absolute left-[39px] md:left-1/2 top-0 bottom-0 w-px bg-white/5 md:-translate-x-1/2" />
              <motion.div 
                 className="absolute left-[39px] md:left-1/2 top-0 w-px bg-gradient-to-b from-transparent via-cyan-500 to-cyan-400 md:-translate-x-1/2 shadow-[0_0_15px_rgba(6,182,212,0.6)]"
                 style={{ height: candidateHeight, transformOrigin: "top" }} 
              />
              
              <div className="space-y-24 md:space-y-32 relative z-10">
                {candidateWorkflowSteps.map((step, i) => (
                  <div key={step.title} className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 md:gap-16 items-start md:items-center relative">
                    <div className={cn("pl-20 md:pl-0", i % 2 === 0 ? "md:text-right md:col-start-1 md:row-start-1" : "md:col-start-3 md:text-left md:row-start-1")}>
                      <ScrollReveal>
                        <div className="text-xs font-mono text-cyan-500/60 mb-3">{step.step} {"//"}</div>
                        <h4 className="text-2xl md:text-3xl font-medium text-white mb-3 text-balance font-display">{step.title}</h4>
                        <p className="text-lg text-slate-400 font-light leading-relaxed">{step.text}</p>
                      </ScrollReveal>
                    </div>
                    <div className="absolute left-[15px] md:static md:col-start-2 md:row-start-1 top-2 md:top-auto w-12 h-12 rounded-full border border-cyan-500/30 bg-[#041d24] flex items-center justify-center z-20 shadow-[0_0_20px_rgba(0,0,0,0.8)] mt-2 md:mt-0">
                      <step.icon className="h-5 w-5 text-cyan-400" aria-hidden="true" />
                    </div>
                    <div className={cn("pl-20 md:pl-0 w-full", i % 2 === 0 ? "md:col-start-3 md:row-start-1" : "md:col-start-1 md:row-start-1")}>
                      <ScrollReveal delay={0.1}>
                        <div className="w-full aspect-video rounded-xl border border-white/10 bg-white/5 flex flex-col items-center justify-center text-slate-500 text-sm overflow-hidden relative group">
                           <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/[0.02] to-transparent pointer-events-none" />
                           <div className="h-10 w-10 rounded-full border border-cyan-500/20 bg-cyan-500/5 flex items-center justify-center mb-3">
                             <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-cyan-500/50 ml-1" />
                           </div>
                           <span>Media Placeholder</span>
                        </div>
                      </ScrollReveal>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <SectionDivider />

          {/* Platform Overview Video/Slideshow Section */}
          <section id="solutions" className="w-full">
            <div className="mb-16">
              <SectionHeading
                eyebrow="Platform Overview"
                title={<>See <CtrlText className="h-[0.9em]" /> in action.</>}
                body="Watch how our platform empowers hiring managers with data and gives candidates a fair, realistic evaluation."
                centered
              />
            </div>
            
            <ScrollReveal delay={0.2}>
              <div className="relative mx-auto max-w-5xl aspect-video rounded-[2rem] border border-white/10 bg-[#080808] overflow-hidden shadow-2xl group flex items-center justify-center">
                {/* Subtle background glow */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent pointer-events-none" />

                {/* Placeholder Content - Replace with your <video> or Carousel component */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                  <div className="h-20 w-20 rounded-full border border-white/10 bg-white/5 flex items-center justify-center backdrop-blur-md transition-transform duration-300 group-hover:scale-110 mb-6 cursor-pointer">
                    <div className="w-0 h-0 border-y-[10px] border-y-transparent border-l-[16px] border-l-white ml-1" />
                  </div>
                  <h4 className="text-xl font-medium text-white mb-2 text-balance">Platform Overview Video</h4>
                  <p className="text-sm text-slate-500 max-w-sm">Replace this container with your video element, iframe, or a slideshow of screenshots.</p>
                </div>

                {/* Optional Mockup Window Bar for aesthetics */}
                <div className="absolute top-0 inset-x-0 h-12 border-b border-white/5 bg-[#0a0a0a] flex items-center px-6">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-white/10" />
                    <div className="w-3 h-3 rounded-full bg-white/10" />
                    <div className="w-3 h-3 rounded-full bg-white/10" />
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </section>
          
        </div>

        {/* Contact Section */}
        <section id="contact" className="relative min-h-[70svh] overflow-hidden border-t border-white/5 flex flex-col justify-center">
          <div className="absolute inset-0 pointer-events-none">
             {/* Animated Data Streams Background */}
             <AnimatedBackground disabled={reduceMotion} />
             
             {/* Soft fade to blend with the footer below */}
             <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t footer-blend-fade pointer-events-none z-10" />
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col justify-center px-6 py-32">
             <ScrollReveal>
                <div className="max-w-3xl mx-auto text-center">
                  <div className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-1.5 text-xs font-medium text-slate-400 mb-8 backdrop-blur-sm font-mono">
                    Get Started
                  </div>
                  <h2 className="text-4xl md:text-6xl font-medium tracking-tight text-white mb-6 text-balance font-display">Ready to Transform Your Recruitment Process?</h2>
                  <p className="text-lg md:text-xl leading-relaxed text-slate-400 font-light mb-10 max-w-xl mx-auto">
                    Discover how CTRL helps organisations identify high-potential candidates, reduce recruitment risk and make more confident hiring decisions through realistic assessments and immersive simulation.
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Button asChild className="h-12 md:h-14 rounded-full bg-white px-8 text-black hover:bg-slate-200 transition-colors text-sm md:text-base font-medium focus-visible:ring-2 focus-visible:ring-white/50">
                      <Link href="/auth/register?mode=register" className="flex items-center justify-center">
                        Get Started <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => scrollToAnchor("capabilities")} className="h-12 md:h-14 rounded-full border border-white/10 bg-transparent px-8 text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-sm md:text-base font-medium focus-visible:ring-2 focus-visible:ring-white/20">
                      Explore Platform
                    </Button>
                  </div>
                </div>
             </ScrollReveal>
          </div>
        </section>

        <footer className="border-t border-white/5 bg-[#020202] pt-24 pb-12 relative z-20">
          <ScrollReveal y={20}>
            <div className="mx-auto max-w-[1440px] px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
                <div className="lg:col-span-2 flex flex-col gap-6 max-w-sm">
                  <BrandLogo layout="stacked" className="self-start" />
                  <p className="text-slate-500 text-sm leading-relaxed font-light mt-2">
                    Empowering teams to make objective, data-driven hiring decisions with confidence and speed.
                  </p>
                </div>

                <div className="flex flex-col gap-5">
                  <h4 className="text-white font-medium text-xs tracking-[0.2em] uppercase">Explore</h4>
                  {navItems.map(item => (
                    <button
                      key={item.href}
                      onClick={() => scrollToAnchor(item.href.slice(1))}
                      className="text-left text-slate-400 hover:text-white text-sm transition-colors font-light focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 rounded px-1"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-5">
                  <h4 className="text-white font-medium text-xs tracking-[0.2em] uppercase">Access</h4>
                  <Link href="/auth/register?mode=register" className="text-slate-400 hover:text-white text-sm transition-colors font-light">Get Started</Link>
                  <Link href="/privacy-policy" className="text-slate-400 hover:text-white text-sm transition-colors font-light">Privacy Policy</Link>
                  <Link href="/terms-conditions" className="text-slate-400 hover:text-white text-sm transition-colors font-light">Terms</Link>
                </div>
              </div>

              <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-sm text-slate-500 font-light">© {new Date().getFullYear()} <CtrlText className="h-[0.8em]" /> Recruitment. All rights reserved.</p>
                <div className="flex items-center gap-2 text-sm text-slate-500 font-light">
                  <span className="h-2 w-2 rounded-full bg-slate-600" />
                  Built for high-stakes recruitment
                </div>
              </div>
            </div>
          </ScrollReveal>
        </footer>
      </main>
    </div>
  );
}
