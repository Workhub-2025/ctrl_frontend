"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { authFieldClassName } from "@/components/auth/auth-surface";
import {
  AnimatedSubmitButton,
  type ButtonState,
  type SubmitButtonPanelVariant,
} from "@/components/ui/animated-submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AuthTotpFormProps = {
  disabled?: boolean;
  panelVariant?: SubmitButtonPanelVariant;
  inputVariant?: "dark" | "light";
  onSubmit: (code: string) => Promise<void>;
  onCancel?: () => void;
};

export const AuthTotpForm = memo(function AuthTotpForm({
  disabled = false,
  panelVariant = "dark-panel",
  onSubmit,
  onCancel,
}: AuthTotpFormProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitStatus, setSubmitStatus] = useState<ButtonState>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (disabled) return;

      const normalized = code.replace(/\s/g, "");
      if (!normalized) {
        setError("Enter the 6-digit code from your authenticator app.");
        setSubmitStatus("invalid");
        return;
      }

      try {
        setError("");
        setSubmitStatus("loading");
        await onSubmit(normalized);
        setSubmitStatus("success");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Verification failed.");
        setSubmitStatus("error");
      }
    },
    [code, disabled, onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="flex items-center gap-3 rounded-xl border border-info/30 bg-info/10 px-4 py-3 text-sm text-foreground">
        <ShieldCheck className="h-5 w-5 shrink-0 text-info" aria-hidden="true" />
        <p>
          Enter the 6-digit code from your authenticator app (including iOS Passwords). Backup codes
          work too.
        </p>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="login-totp-code"
          className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Authentication code
        </Label>
        <Input
          ref={inputRef}
          id="login-totp-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          value={code}
          maxLength={16}
          onChange={(event) => {
            setCode(event.target.value);
            if (error) setError("");
            if (submitStatus !== "idle" && submitStatus !== "loading") setSubmitStatus("idle");
          }}
          disabled={disabled || submitStatus === "loading"}
          className={cn(authFieldClassName(), "text-center font-mono text-lg tracking-[0.35em]")}
        />
      </div>

      <AnimatedSubmitButton
        type="submit"
        status={submitStatus}
        idleText="Verify and continue"
        errorMessage={submitStatus === "error" ? error : undefined}
        disabled={disabled || submitStatus === "loading" || code.trim().length === 0}
        panelVariant={panelVariant}
        className="w-full"
      />

      {onCancel ? (
        <Button
          type="button"
          variant="ghost"
          className="w-full rounded-xl"
          disabled={disabled || submitStatus === "loading"}
          onClick={onCancel}
        >
          Back to password sign-in
        </Button>
      ) : null}
    </form>
  );
});
