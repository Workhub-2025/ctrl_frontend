"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonState = "idle" | "loading" | "success" | "error" | "invalid";

/** @deprecated Kept for call-site compatibility; colours now use semantic tokens. */
export type SubmitButtonPanelVariant = "dark-panel" | "light-panel";

interface AnimatedSubmitButtonProps extends Omit<HTMLMotionProps<"button">, "disabled"> {
  status: ButtonState;
  idleText?: string;
  errorMessage?: string;
  disabled?: boolean;
  panelVariant?: SubmitButtonPanelVariant;
}

export function AnimatedSubmitButton({
  status,
  idleText = "Submit",
  errorMessage,
  className,
  disabled,
  panelVariant: _panelVariant,
  ...props
}: AnimatedSubmitButtonProps) {
  const [internalState, setInternalState] = useState<ButtonState>(status);

  useEffect(() => {
    setInternalState(status);

    if (status === "invalid" || status === "error") {
      const timer = setTimeout(() => {
        setInternalState("idle");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const isInactive =
    internalState === "loading" || (internalState === "idle" && disabled);

  let bgColor = "bg-primary";
  let textColor = "text-primary-foreground";
  let hoverColor = "hover:bg-primary/90";
  let shadowClass = "shadow-none";

  if (internalState === "error" || internalState === "invalid") {
    bgColor = "bg-destructive";
    textColor = "text-destructive-foreground";
    hoverColor = "hover:bg-destructive/90";
  } else if (internalState === "success") {
    bgColor = "bg-success";
    textColor = "text-success-foreground";
    hoverColor = "hover:bg-success/90";
  } else if (isInactive) {
    bgColor = "bg-muted";
    textColor = "text-muted-foreground";
    hoverColor = "";
  }

  return (
    <div className={cn("relative flex w-full justify-center", className)}>
      <motion.button
        className={cn(
          "relative flex h-12 w-full items-center justify-center overflow-visible rounded-xl font-medium transition-colors",
          shadowClass,
          bgColor,
          textColor,
          hoverColor,
          isInactive && "cursor-not-allowed",
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
          {(internalState === "error" || internalState === "invalid") && errorMessage ? (
            <div className="pointer-events-none absolute -top-12 left-0 right-0 z-50 flex justify-center px-2">
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                className="relative max-w-full rounded-lg bg-destructive px-3 py-2 text-center text-sm font-medium text-destructive-foreground shadow-lg"
              >
                <span className="block truncate">{errorMessage}</span>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-destructive" />
              </motion.div>
            </div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {internalState === "loading" ? (
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
          ) : null}

          {internalState === "success" ? (
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
          ) : null}

          {internalState === "error" || internalState === "invalid" ? (
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
          ) : null}

          {internalState === "idle" ? (
            <motion.span
              key="text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute w-full truncate whitespace-nowrap px-4 text-center"
            >
              {idleText}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
