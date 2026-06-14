"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown, Volume2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

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

  return (
    <section
      id="landing-hero"
      className={`relative min-h-[95svh] lg:min-h-[105svh] overflow-hidden flex flex-col items-center justify-center pb-20 ${bgColor}`}
    >
      {/* Animated Data Streams Background */}
      <AnimatedBackground disabled={reduceMotion} />
      
      {/* Soft bottom fade to seamlessly blend into the next section */}
      <div 
        className="absolute bottom-0 inset-x-0 h-48 pointer-events-none z-0" 
        style={{ background: `linear-gradient(to top, ${gradientColor.startsWith('#') ? gradientColor : (gradientColor === 'black' ? 'black' : 'var(--tw-gradient-from)')}, transparent)` }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6" style={{ paddingTop: navHeight }}>
        <div className="flex flex-col items-center text-center max-w-[56rem] mx-auto gap-8">
          
          {/* Technical Tag Eyebrow */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 15 }}
            animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5 px-3.5 py-1.5 text-[11px] font-mono tracking-wider text-slate-500 dark:text-slate-400 backdrop-blur-sm pointer-events-none">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SYS_STATUS: ACTIVE // DISPATCH_STACK_ONLINE
            </div>
          </motion.div>

          {/* Main Headline */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight text-slate-900 dark:text-white leading-[1.08] font-display text-balance">
              Hiring the Right People Starts with the Right Intelligence
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          >
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
              CTRL reveals how candidates think, respond and perform under pressure, providing the behavioural insight needed to recruit with confidence, reduce risk and build stronger operational teams.
            </p>
          </motion.div>

          {/* Call to Action Buttons */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
          >
            <Button
              asChild
              className="h-12 md:h-14 rounded-full bg-slate-900 dark:bg-white px-8 text-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors text-sm md:text-base font-medium w-full sm:w-auto focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-white/50"
            >
              <Link href="/auth/register?mode=register" className="flex items-center justify-center">
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
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

          {/* Minimal Waveform Monitor Widget (Center-aligned) */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
            className="w-full max-w-lg mt-8 relative rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0a0a0a]/90 backdrop-blur-md shadow-lg dark:shadow-2xl p-4 flex flex-col gap-3 font-mono text-xs text-left select-none telemetry-grid"
          >
            <div className="flex justify-between items-center text-[10px] text-slate-500">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Voice Connection // Live Telemetry Feed
              </span>
              <span>TIME 01:14</span>
            </div>
            
            <div className="w-full h-12 rounded-lg border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#050505] overflow-hidden relative flex items-center justify-center p-2">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,rgba(255,255,255,0.01)_50%,transparent_100%)] pointer-events-none" />
              <div className="flex items-center gap-1.5 w-full justify-center relative z-10">
                {[16, 28, 18, 38, 22, 32, 14, 30, 20, 34, 15, 26, 12, 22, 30, 42, 28, 48, 16, 33, 49, 12, 24, 38].map((peak, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-slate-400 dark:bg-white/30 rounded-full"
                    style={{ height: "10px" }}
                    animate={reduceMotion ? {} : { height: ["10px", `${peak / 1.3}px`, "10px"] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.05, ease: "easeInOut" }}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex justify-between items-center text-[9px] text-slate-500 tracking-wider">
              <span>GEO_REF: 51.5074° N, 0.1278° W</span>
              <span>WPM: 72 // ACCURACY: 98.4%</span>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Scroll Down Indicator */}
      <motion.button
        onClick={() => scrollToScene("capabilities")}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        initial={reduceMotion ? false : { opacity: 0, y: -10 }}
        animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
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
