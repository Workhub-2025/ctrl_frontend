"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import {
  authFieldClassName,
  authLinkClassName,
} from "@/components/auth/auth-surface";
import {
  AnimatedSubmitButton,
  type ButtonState,
  type SubmitButtonPanelVariant,
} from "@/components/ui/animated-submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AuthLoginFormProps = {
  initialEmail?: string;
  disabled?: boolean;
  panelVariant?: SubmitButtonPanelVariant;
  inputVariant?: "dark" | "light";
  onSubmit: (
    credentials: { email: string; password: string },
  ) => Promise<void | { requiresTotp?: boolean }>;
};

export const AuthLoginForm = memo(function AuthLoginForm({
  initialEmail = "",
  disabled = false,
  panelVariant = "dark-panel",
  onSubmit,
}: AuthLoginFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitStatus, setSubmitStatus] = useState<ButtonState>("idle");
  const [invalidFields, setInvalidFields] = useState<Array<"loginEmail" | "loginPassword">>([]);
  const invalidResetTimer = useRef<number | null>(null);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    return () => {
      if (invalidResetTimer.current) window.clearTimeout(invalidResetTimer.current);
    };
  }, []);

  const inputClassName = useCallback(
    (field: "loginEmail" | "loginPassword", extra?: string) =>
      authFieldClassName(invalidFields.includes(field), extra),
    [invalidFields],
  );

  const showFieldErrors = useCallback((fields: Array<"loginEmail" | "loginPassword">) => {
    if (invalidResetTimer.current) window.clearTimeout(invalidResetTimer.current);
    setError("");
    setInvalidFields(fields);
    setSubmitStatus("invalid");
    invalidResetTimer.current = window.setTimeout(() => {
      setInvalidFields([]);
      setSubmitStatus("idle");
    }, 1800);
  }, []);

  const isSubmittable = email.trim().length > 0 && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    setError("");
    setInvalidFields([]);

    if (!email || !password) {
      const fields: Array<"loginEmail" | "loginPassword"> = [];
      if (!email) fields.push("loginEmail");
      if (!password) fields.push("loginPassword");
      showFieldErrors(fields);
      return;
    }

    try {
      setSubmitStatus("loading");
      const result = await onSubmit({ email, password });
      if (!result?.requiresTotp) {
        setSubmitStatus("success");
      } else {
        setSubmitStatus("idle");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Credentials not verified.");
      setSubmitStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label
          htmlFor="login-email"
          className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Email Address
        </Label>
        <Input
          id="login-email"
          type="email"
          placeholder="john.smith@organization.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError("");
            if (invalidFields.length) setInvalidFields([]);
            if (submitStatus !== "idle" && submitStatus !== "loading") setSubmitStatus("idle");
          }}
          required
          disabled={disabled || submitStatus === "loading"}
          className={inputClassName("loginEmail")}
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="login-password"
            className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Password
          </Label>
          <Link href="/auth/forgot-password" className={cn("text-xs", authLinkClassName)}>
            Forgot Password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
              if (invalidFields.length) setInvalidFields([]);
              if (submitStatus !== "idle" && submitStatus !== "loading") setSubmitStatus("idle");
            }}
            required
            disabled={disabled || submitStatus === "loading"}
            className={inputClassName("loginPassword", "pr-12")}
            autoComplete="current-password"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 rounded-lg px-0 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setShowPassword((current) => !current)}
            disabled={disabled || submitStatus === "loading"}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <AnimatedSubmitButton
          type="submit"
          status={submitStatus}
          idleText="Sign In"
          errorMessage={submitStatus === "error" ? error : undefined}
          disabled={disabled || submitStatus === "loading" || !isSubmittable}
          panelVariant={panelVariant}
          className="w-full"
        />
      </div>
    </form>
  );
});
