"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/**
 * Landing scroll-animation toolkit.
 *
 * Every primitive honours reduced-motion from three sources:
 *  1. the OS / browser (`useReducedMotion`)
 *  2. the app accessibility setting, supplied via <MotionPrefs reduce={...}>
 *  3. an explicit `disabled` prop on the component
 *
 * When motion is disabled the content renders statically with no transforms.
 */

const MotionPrefsContext = createContext(false);

export function MotionPrefs({
  reduce,
  children,
}: {
  reduce: boolean;
  children: ReactNode;
}) {
  return (
    <MotionPrefsContext.Provider value={reduce}>
      {children}
    </MotionPrefsContext.Provider>
  );
}

function useMotionDisabled(localDisabled?: boolean): boolean {
  const ctxReduce = useContext(MotionPrefsContext);
  const osReduce = useReducedMotion();
  return Boolean(localDisabled || ctxReduce || osReduce);
}

const EASE = [0.16, 1, 0.3, 1] as const;

export type RevealVariant =
  | "fade"
  | "fade-up"
  | "zoom"
  | "blur"
  | "left"
  | "right";

const HIDDEN: Record<RevealVariant, Record<string, number | string>> = {
  fade: { opacity: 0 },
  "fade-up": { opacity: 0, y: 36 },
  zoom: { opacity: 0, scale: 0.92 },
  blur: { opacity: 0, y: 18, filter: "blur(14px)" },
  left: { opacity: 0, x: -48 },
  right: { opacity: 0, x: 48 },
};

const SHOWN = {
  opacity: 1,
  x: 0,
  y: 0,
  scale: 1,
  filter: "blur(0px)",
} as const;

/** Single element that animates in the first time it enters the viewport. */
export function Reveal({
  children,
  className,
  variant = "fade-up",
  delay = 0,
  duration = 0.8,
  amount = 0.2,
  once = true,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  amount?: number;
  once?: boolean;
  disabled?: boolean;
}) {
  const reduce = useMotionDisabled(disabled);

  return (
    <motion.div
      className={className}
      initial={reduce ? false : HIDDEN[variant]}
      whileInView={reduce ? undefined : SHOWN}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Container that staggers its <RevealItem> children as the group enters view. */
export function RevealGroup({
  children,
  className,
  stagger = 0.12,
  delayChildren = 0.05,
  amount = 0.2,
  once = true,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
  amount?: number;
  once?: boolean;
  disabled?: boolean;
}) {
  const reduce = useMotionDisabled(disabled);

  const variants: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  };

  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView={reduce ? undefined : "show"}
      viewport={{ once, amount }}
      variants={reduce ? undefined : variants}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className,
  variant = "fade-up",
  duration = 0.7,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  variant?: RevealVariant;
  duration?: number;
  disabled?: boolean;
}) {
  const reduce = useMotionDisabled(disabled);

  const variants: Variants = {
    hidden: HIDDEN[variant],
    show: { ...SHOWN, transition: { duration, ease: EASE } },
  };

  return (
    <motion.div className={className} variants={reduce ? undefined : variants}>
      {children}
    </motion.div>
  );
}

/**
 * Scroll-linked zoom. The element scales up and fades in as it enters the
 * viewport, then scales back down and fades as it leaves — an entrance *and*
 * exit animation driven by scroll position.
 */
export function ZoomOnScroll({
  children,
  className,
  from = 0.86,
  to = 1,
  fadeFrom = 0.35,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  from?: number;
  to?: number;
  fadeFrom?: number;
  disabled?: boolean;
}) {
  const reduce = useMotionDisabled(disabled);
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [from, to, to, from]);
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.25, 0.75, 1],
    [fadeFrom, 1, 1, fadeFrom]
  );

  if (reduce) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div ref={ref} className={className} style={{ scale, opacity }}>
      {children}
    </motion.div>
  );
}

/** Vertical parallax: content drifts opposite to scroll for a depth effect. */
export function Parallax({
  children,
  className,
  distance = 60,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
  disabled?: boolean;
}) {
  const reduce = useMotionDisabled(disabled);
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);

  if (reduce) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div ref={ref} className={className} style={{ y }}>
      {children}
    </motion.div>
  );
}

/** Animated separator between sections. */
export function SectionDivider({
  className,
  disabled,
}: {
  className?: string;
  disabled?: boolean;
}) {
  const reduce = useMotionDisabled(disabled);

  return (
    <div
      className={cn(
        "relative w-full h-24 md:h-40 flex items-center justify-center overflow-hidden opacity-60 my-6 md:my-12",
        className
      )}
      aria-hidden="true"
    >
      <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-slate-300/40 dark:via-white/10 to-transparent" />
      <motion.div
        className="absolute w-[2px] h-16 bg-gradient-to-b from-transparent via-slate-500 dark:via-white to-transparent blur-[1px]"
        animate={reduce ? {} : { y: [-130, 130] }}
        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
      />
    </div>
  );
}
