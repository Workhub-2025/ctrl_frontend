"use client";

import React, { useEffect, useState } from "react";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonState = "idle" | "loading" | "success" | "error" | "invalid";

/** @deprecated Kept for call-site compatibility; colours now use semantic tokens. */
export type SubmitButtonPanelVariant = "dark-panel" | "light-panel";

interface AnimatedSubmitButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> {
  status: ButtonState;
  idleText?: string;
  errorMessage?: string;
  disabled?: boolean;
  panelVariant?: SubmitButtonPanelVariant;
}

/**
 * Submit button whose colour and icon follow the request: working, done, or
 * failed. A failure message is announced to assistive technology and stays
 * visible below the button until the next attempt; it is never truncated.
 * The name is kept for existing call sites: there is no decorative motion.
 */
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

    // The button returns to its normal look after a moment so the candidate
    // can retry; the message itself stays until the status changes.
    if (status === "invalid" || status === "error") {
      const timer = setTimeout(() => {
        setInternalState("idle");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const failed = internalState === "error" || internalState === "invalid";
  const isInactive =
    internalState === "loading" || (internalState === "idle" && disabled);
  const showMessage = (status === "error" || status === "invalid") && Boolean(errorMessage);

  const tone = failed
    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
    : internalState === "success"
      ? "bg-success text-success-foreground hover:bg-success/90"
      : isInactive
        ? "bg-muted text-muted-foreground"
        : "bg-primary text-primary-foreground hover:bg-primary/90";

  return (
    <div className={cn("flex w-full flex-col items-stretch gap-2", className)}>
      <button
        className={cn(
          "relative inline-flex h-12 w-full items-center justify-center gap-2 rounded-md px-4 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          tone,
          isInactive && "cursor-not-allowed",
        )}
        disabled={internalState === "loading" || internalState === "success" || disabled}
        aria-busy={internalState === "loading" || undefined}
        {...props}
      >
        {internalState === "loading" ? (
          <Loader2 className="h-5 w-5 motion-safe:animate-spin" aria-hidden="true" />
        ) : internalState === "success" ? (
          <CheckCircle className="h-5 w-5" aria-hidden="true" />
        ) : failed ? (
          <XCircle className="h-5 w-5" aria-hidden="true" />
        ) : null}
        <span className="truncate">{idleText}</span>
      </button>
      {showMessage ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
