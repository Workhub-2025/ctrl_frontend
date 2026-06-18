"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonState = "idle" | "loading" | "success" | "error" | "invalid";

interface AnimatedSubmitButtonProps extends Omit<HTMLMotionProps<"button">, "disabled"> {
  status: ButtonState;
  idleText?: string;
  errorMessage?: string;
  disabled?: boolean;
}

export function AnimatedSubmitButton({
  status,
  idleText = "Submit",
  errorMessage,
  className,
  disabled,
  ...props
}: AnimatedSubmitButtonProps) {
  const [internalState, setInternalState] = useState<ButtonState>(status);

  useEffect(() => {
    setInternalState(status);
    
    // Auto-reset invalid and error states after animation
    if (status === "invalid" || status === "error") {
      const timer = setTimeout(() => {
        setInternalState("idle");
      }, 2500); // 2.5 seconds to read the message, then fade back
      return () => clearTimeout(timer);
    }
  }, [status]);

  const isInactive =
    internalState === "loading" || (internalState === "idle" && disabled);

  let bgColor = "bg-white";
  let textColor = "text-black";
  let hoverColor = "hover:bg-slate-200 hover:shadow-sm";
  let shadowClass = "shadow-none";

  if (internalState === "error" || internalState === "invalid") {
    bgColor = "bg-red-500";
    textColor = "text-white";
    hoverColor = "hover:bg-red-600";
    shadowClass = "shadow-none";
  } else if (internalState === "success") {
    bgColor = "bg-emerald-500";
    textColor = "text-white";
    hoverColor = "hover:bg-emerald-600";
    shadowClass = "shadow-none";
  } else if (isInactive) {
    bgColor = "bg-white/20";
    textColor = "text-slate-400";
    hoverColor = "";
    shadowClass = "shadow-none";
  }

  return (
    <div className={cn("relative flex justify-center w-full", className)}>
      <motion.button
        className={cn(
          "relative flex h-12 w-full rounded-xl items-center justify-center font-medium transition-colors overflow-visible",
          shadowClass,
          bgColor,
          textColor,
          hoverColor,
          isInactive && "cursor-not-allowed"
        )}
        animate={
          internalState === "error" || internalState === "invalid"
            ? { x: [0, -10, 10, -10, 10, -5, 5, 0], transition: { duration: 0.4 } }
            : internalState === "success"
            ? { x: [0, -5, 5, -5, 5, 0], transition: { duration: 0.4 } }
            : { x: 0 }
        }
        initial={false}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        disabled={internalState === "loading" || internalState === "success" || disabled}
        {...props}
      >
        <AnimatePresence>
          {(internalState === "error" || internalState === "invalid") && errorMessage && (
            <div className="pointer-events-none absolute -top-12 left-0 right-0 z-50 flex justify-center px-2">
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                className="relative max-w-full rounded-lg bg-red-500 px-3 py-2 text-center text-sm font-medium text-white shadow-lg"
              >
                <span className="block truncate">{errorMessage}</span>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-red-500" />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {internalState === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
              transition={{ duration: 0.2 }}
              className="absolute flex items-center justify-center"
            >
              <Loader2 className="h-6 w-6 animate-spin" />
            </motion.div>
          )}
          
          {internalState === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="absolute flex items-center justify-center"
            >
              <CheckCircle className="h-6 w-6" />
            </motion.div>
          )}

          {(internalState === "error" || internalState === "invalid") && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="absolute flex items-center justify-center"
            >
              <XCircle className="h-6 w-6" />
            </motion.div>
          )}

          {internalState === "idle" && (
            <motion.span
              key="text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute whitespace-nowrap px-4 w-full text-center truncate"
            >
              {idleText}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
