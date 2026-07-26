"use client";

import { useCallback, useState } from "react";
import { KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedSubmitButton, type ButtonState, type SubmitButtonPanelVariant } from "@/components/ui/animated-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitiseAccessCode } from "@/lib/security/input-sanitization";

const DARK_INPUT =
  "h-12 rounded-xl border-white/10 bg-white/[0.03] font-mono text-base tracking-[0.18em] text-white placeholder:tracking-normal placeholder:text-slate-600 uppercase transition-[border-color,box-shadow] focus-visible:border-amber-500/50 focus-visible:ring-1 focus-visible:ring-amber-500/40";
const LIGHT_INPUT =
  "h-12 rounded-xl border-slate-300 bg-white font-mono text-base tracking-[0.18em] text-slate-950 placeholder:tracking-normal placeholder:text-slate-400 uppercase shadow-sm transition-[border-color,box-shadow] focus-visible:border-amber-600/50 focus-visible:ring-1 focus-visible:ring-amber-600/30";

type SessionAccessCodeFormProps = {
  initialCode?: string;
  disabled?: boolean;
  panelVariant?: SubmitButtonPanelVariant;
  inputVariant?: "dark" | "light";
  submitLabel?: string;
  onSubmit: (accessCode: string) => Promise<void>;
};

export function SessionAccessCodeForm({
  initialCode = "",
  disabled = false,
  panelVariant = "dark-panel",
  inputVariant = "dark",
  submitLabel = "Continue with code",
  onSubmit,
}: SessionAccessCodeFormProps) {
  const [code, setCode] = useState(sanitiseAccessCode(initialCode));
  const [error, setError] = useState("");
  const [submitStatus, setSubmitStatus] = useState<ButtonState>("idle");

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (disabled) return;
      const next = sanitiseAccessCode(code);
      if (next.length < 4) {
        setError("Enter the full session access code you were given.");
        setSubmitStatus("invalid");
        return;
      }
      setError("");
      try {
        setSubmitStatus("loading");
        await onSubmit(next);
        setSubmitStatus("success");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not continue with that code.");
        setSubmitStatus("error");
      }
    },
    [code, disabled, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label
          htmlFor="session-access-code"
          className={cn(
            "flex items-center gap-2 text-xs font-semibold uppercase tracking-wider",
            inputVariant === "light" ? "text-slate-600" : "text-slate-400"
          )}
        >
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
          Session access code
        </Label>
        <Input
          id="session-access-code"
          name="accessCode"
          inputMode="text"
          autoComplete="one-time-code"
          spellCheck={false}
          placeholder="ENTER CODE"
          value={code}
          onChange={(event) => {
            setCode(sanitiseAccessCode(event.target.value));
            if (error) setError("");
            if (submitStatus !== "idle" && submitStatus !== "loading") setSubmitStatus("idle");
          }}
          disabled={disabled || submitStatus === "loading"}
          className={inputVariant === "light" ? LIGHT_INPUT : DARK_INPUT}
          aria-describedby="session-access-code-hint"
        />
        <p
          id="session-access-code-hint"
          className={cn(
            "text-xs leading-5",
            inputVariant === "light" ? "text-slate-500" : "text-slate-500"
          )}
        >
          Codes expire 24 hours after they are issued. Ask your hiring manager for a fresh
          code if yours has expired.
        </p>
      </div>

      <AnimatedSubmitButton
        type="submit"
        status={submitStatus}
        idleText={submitLabel}
        errorMessage={submitStatus === "error" || submitStatus === "invalid" ? error : undefined}
        disabled={disabled || submitStatus === "loading" || code.length < 4}
        panelVariant={panelVariant}
        className="w-full"
      />
    </form>
  );
}
