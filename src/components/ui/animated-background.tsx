"use client";

import { motion } from "framer-motion";

const ANIMATED_LINES = [
  // Horizontal Left to Right
  { id: 1, cls: "top-[15%] left-0 w-48 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent", start: { x: "-100%" }, end: { x: "100vw" }, duration: 7, delay: 0 },
  { id: 2, cls: "top-[40%] left-0 w-96 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent", start: { x: "-100%" }, end: { x: "100vw" }, duration: 11, delay: 2 },
  { id: 3, cls: "top-[75%] left-0 w-16 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent", start: { x: "-100%" }, end: { x: "100vw" }, duration: 5, delay: 1 },
  { id: 4, cls: "top-[85%] left-0 w-64 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent", start: { x: "-100%" }, end: { x: "100vw" }, duration: 8, delay: 4 },
  // Horizontal Right to Left
  { id: 5, cls: "top-[25%] right-0 w-32 h-[1px] bg-gradient-to-l from-transparent via-white/20 to-transparent", start: { x: "100%" }, end: { x: "-100vw" }, duration: 8, delay: 3 },
  { id: 6, cls: "top-[60%] right-0 w-16 h-[1px] bg-gradient-to-l from-transparent via-white/30 to-transparent", start: { x: "100%" }, end: { x: "-100vw" }, duration: 6, delay: 0.5 },
  { id: 7, cls: "top-[90%] right-0 w-72 h-[1px] bg-gradient-to-l from-transparent via-white/10 to-transparent", start: { x: "100%" }, end: { x: "-100vw" }, duration: 10, delay: 2 },
  { id: 8, cls: "top-[10%] right-0 w-48 h-[1px] bg-gradient-to-l from-transparent via-white/20 to-transparent", start: { x: "100%" }, end: { x: "-100vw" }, duration: 7, delay: 5 },
  // Vertical Top to Bottom
  { id: 9, cls: "left-[20%] top-0 w-[1px] h-48 bg-gradient-to-b from-transparent via-white/20 to-transparent", start: { y: "-100%" }, end: { y: "100vh" }, duration: 8, delay: 1 },
  { id: 10, cls: "left-[50%] top-0 w-[1px] h-96 bg-gradient-to-b from-transparent via-white/10 to-transparent", start: { y: "-100%" }, end: { y: "100vh" }, duration: 12, delay: 0 },
  { id: 11, cls: "left-[80%] top-0 w-[1px] h-16 bg-gradient-to-b from-transparent via-white/30 to-transparent", start: { y: "-100%" }, end: { y: "100vh" }, duration: 5, delay: 2.5 },
  { id: 12, cls: "left-[10%] top-0 w-[1px] h-64 bg-gradient-to-b from-transparent via-white/20 to-transparent", start: { y: "-100%" }, end: { y: "100vh" }, duration: 9, delay: 4 },
  // Vertical Bottom to Top
  { id: 13, cls: "left-[35%] bottom-0 w-[1px] h-32 bg-gradient-to-t from-transparent via-white/20 to-transparent", start: { y: "100%" }, end: { y: "-100vh" }, duration: 7, delay: 2 },
  { id: 14, cls: "left-[65%] bottom-0 w-[1px] h-16 bg-gradient-to-t from-transparent via-white/30 to-transparent", start: { y: "100%" }, end: { y: "-100vh" }, duration: 6, delay: 0.5 },
  { id: 15, cls: "left-[90%] bottom-0 w-[1px] h-72 bg-gradient-to-t from-transparent via-white/10 to-transparent", start: { y: "100%" }, end: { y: "-100vh" }, duration: 11, delay: 3.5 },
  { id: 16, cls: "left-[75%] bottom-0 w-[1px] h-48 bg-gradient-to-t from-transparent via-white/20 to-transparent", start: { y: "100%" }, end: { y: "-100vh" }, duration: 8, delay: 1.5 },
];

export function AnimatedBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {ANIMATED_LINES.map((line) => (
        <motion.div
          key={line.id}
          className={`absolute ${line.cls}`}
          initial={line.start}
          animate={line.end}
          transition={{
            duration: line.duration,
            delay: line.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}