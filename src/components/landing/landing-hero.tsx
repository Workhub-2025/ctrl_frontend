"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
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
};

export function LandingHero({ navHeight = 96 }: LandingHeroProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <section
      id="landing-hero"
      className="relative min-h-[90svh] lg:min-h-[100svh] overflow-hidden flex flex-col items-center justify-center bg-black"
    >
      {/* Animated Data Streams Background */}
      <AnimatedBackground />
      
      {/* Soft bottom fade to seamlessly blend into the next section */}
      <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-black to-transparent pointer-events-none z-0" />

      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6" style={{ paddingTop: navHeight }}>
        <div className="flex flex-col items-center text-center max-w-[54rem] mx-auto">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          >
            {/* Reduced sizing slightly, cleaner tracking, removed intense italic */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight text-white mb-8 leading-[1.1]">
              Evaluate performance under actual pressure.
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            {/* Softened text color, increased line height for breathability */}
            <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
              Stop guessing based on interviews. Immerse candidates in realistic control room simulations to see how they handle true emergency scenarios before you hire.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
          >
            <Button
              asChild
              className="h-12 md:h-14 rounded-full bg-white px-8 text-black hover:bg-slate-200 transition-all text-sm md:text-base font-medium w-full sm:w-auto"
            >
              <Link href="/auth/register?mode=register">
              Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => scrollToScene("capabilities")}
              className="h-12 md:h-14 rounded-full border border-white/10 bg-transparent px-8 text-slate-300 hover:bg-white/5 hover:text-white transition-all text-sm md:text-base font-medium w-full sm:w-auto"
            >
              Explore the Platform
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Scroll Down Indicator */}
      <motion.button
        onClick={() => scrollToScene("capabilities")}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 text-slate-500 hover:text-white transition-colors"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
        aria-label="Scroll down"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <ChevronDown className="h-8 w-8" />
        </motion.div>
      </motion.button>
    </section>
  );
}
