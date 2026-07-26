"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { FirebaseError } from "firebase/app";
import { Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import {
  claimCandidateSessionJoin,
  registerCandidateSessionJoin,
} from "@/lib/firebase-auth-browser";
import { readPendingSessionJoin } from "@/lib/pending-session-join";
import { getPasswordPolicyIssue } from "@/lib/security/password-policy";
import { sanitiseAccessCode } from "@/lib/security/input-sanitization";
import { cn } from "@/lib/utils";
import {
  AnimatedSubmitButton,
  type ButtonState,
  type SubmitButtonPanelVariant,
} from "@/components/ui/animated-submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FIELD_INPUT =
  "h-12 rounded-xl border-border bg-background text-foreground placeholder:text-muted-foreground shadow-sm transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring";
const CODE_INPUT =
  "h-12 rounded-xl border-border bg-background font-mono text-base tracking-[0.18em] text-foreground placeholder:tracking-normal placeholder:text-muted-foreground uppercase shadow-sm transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring";

type SessionJoinFormProps = {
  initialCode?: string;
  initialEmail?: string;
  startOnVerify?: boolean;
  disabled?: boolean;
  panelVariant?: SubmitButtonPanelVariant;
  inputVariant?: "dark" | "light";
};

function joinErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password" ||
      error.code === "auth/user-not-found"
    ) {
      return "Email or password is incorrect. Use the details you created for this assessment.";
    }
    if (error.code === "auth/weak-password") {
      return "Choose a stronger password (at least 12 characters).";
    }
    if (error.code === "auth/too-many-requests") {
      return "Too many attempts. Wait a moment and try again.";
    }
    if (error.code === "auth/network-request-failed") {
      return "Could not reach authentication. Check your connection and try again.";
    }
  }
  return error instanceof Error ? error.message : "Could not join with those details.";
}

export function SessionJoinForm({
  initialCode = "",
  initialEmail = "",
  startOnVerify = false,
  disabled = false,
  panelVariant = "dark-panel",
  inputVariant = "dark",
}: SessionJoinFormProps) {
  const pending = typeof window !== "undefined" ? readPendingSessionJoin() : null;
  const [step, setStep] = useState<"register" | "verify">(
    startOnVerify || pending ? "verify" : "register",
  );
  const [code, setCode] = useState(
    sanitiseAccessCode(pending?.accessCode ?? initialCode),
  );
  const [displayName, setDisplayName] = useState(pending?.displayName ?? "");
  const [email, setEmail] = useState(pending?.email ?? initialEmail);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [submitStatus, setSubmitStatus] = useState<ButtonState>("idle");
  const fieldClass = FIELD_INPUT;
  const codeClass = CODE_INPUT;
  const muted = "text-muted-foreground";
  const labelClass = cn(
    "text-xs font-semibold uppercase tracking-wider",
    "text-muted-foreground",
  );

  const finishClaim = useCallback(async () => {
    const result = await claimCandidateSessionJoin({
      accessCode: code,
      displayName: displayName.trim() || email.split("@")[0] || "Candidate",
      email,
      password: password || undefined,
    });
    window.location.assign(result.redirectPath);
  }, [code, displayName, email, password]);

  const handleRegister = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (disabled) return;
      const nextCode = sanitiseAccessCode(code);
      if (nextCode.length < 4) {
        setError("Enter the full session access code you were given.");
        setSubmitStatus("invalid");
        return;
      }
      if (displayName.trim().length < 2) {
        setError("Enter the name you want shown on your assessment.");
        setSubmitStatus("invalid");
        return;
      }
      const passwordIssue = getPasswordPolicyIssue(password, email);
      if (passwordIssue) {
        setError(passwordIssue);
        setSubmitStatus("invalid");
        return;
      }
      if (password !== passwordConfirmation) {
        setError("Passwords do not match.");
        setSubmitStatus("invalid");
        return;
      }

      setError("");
      setStatusMessage("");
      try {
        setSubmitStatus("loading");
        const result = await registerCandidateSessionJoin({
          accessCode: nextCode,
          displayName,
          email,
          password,
        });
        setCode(nextCode);
        if (result.status === "verification_required") {
          setStep("verify");
          setSubmitStatus("idle");
          setStatusMessage(
            `We sent a verification link to ${result.email}. Open it, then continue here.`,
          );
          return;
        }
        await finishClaim();
        setSubmitStatus("success");
      } catch (err) {
        setError(joinErrorMessage(err));
        setSubmitStatus("error");
      }
    },
    [
      code,
      disabled,
      displayName,
      email,
      finishClaim,
      password,
      passwordConfirmation,
    ],
  );

  const handleVerifyContinue = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (disabled) return;
      setError("");
      try {
        setSubmitStatus("loading");
        await finishClaim();
        setSubmitStatus("success");
      } catch (err) {
        setError(joinErrorMessage(err));
        setSubmitStatus("error");
      }
    },
    [disabled, finishClaim],
  );

  const handleResend = useCallback(async () => {
    setError("");
    setStatusMessage("");
    try {
      if (!password) {
        throw new Error(
          "Enter your password above, then resend the verification email.",
        );
      }
      const result = await registerCandidateSessionJoin({
        accessCode: code,
        displayName: displayName.trim() || email.split("@")[0] || "Candidate",
        email,
        password,
      });
      if (result.status === "ready_to_claim") {
        setStatusMessage(
          "Your email is already verified. Continue to join the session.",
        );
        return;
      }
      setStatusMessage(`Verification email sent again to ${email}.`);
    } catch (err) {
      setError(joinErrorMessage(err));
    }
  }, [code, displayName, email, password]);

  if (step === "verify") {
    return (
      <form onSubmit={handleVerifyContinue} className="space-y-5" noValidate>
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm leading-6",
            "border-border bg-card text-muted-foreground",
          )}
        >
          <p className="flex items-start gap-2">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {statusMessage ||
                `We sent a Firebase verification email to ${email || "your inbox"}. Open the link, then return here and continue. The same email and password work later via Sign in if you get signed out.`}
            </span>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="join-verify-email" className={labelClass}>
            Email
          </Label>
          <Input
            id="join-verify-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={disabled || submitStatus === "loading"}
            className={fieldClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="join-verify-password" className={labelClass}>
            Password
          </Label>
          <Input
            id="join-verify-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={disabled || submitStatus === "loading"}
            className={fieldClass}
          />
          <p className={cn("text-xs leading-5", muted)}>
            Needed if you opened the verification link in another browser.
          </p>
        </div>

        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <AnimatedSubmitButton
          type="submit"
          status={submitStatus}
          idleText="I've verified — continue"
          errorMessage={
            submitStatus === "error" || submitStatus === "invalid" ? error : undefined
          }
          disabled={disabled || submitStatus === "loading"}
          panelVariant={panelVariant}
          className="w-full"
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "h-auto px-0 text-sm",
              "text-muted-foreground",
            )}
            onClick={() => void handleResend()}
            disabled={disabled || submitStatus === "loading"}
          >
            Resend verification email
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "h-auto px-0 text-sm",
              "text-muted-foreground",
            )}
            onClick={() => {
              setStep("register");
              setError("");
              setSubmitStatus("idle");
            }}
            disabled={disabled || submitStatus === "loading"}
          >
            Edit details
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleRegister} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label
          htmlFor="join-access-code"
          className={cn(labelClass, "flex items-center gap-2")}
        >
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
          Session access code
        </Label>
        <Input
          id="join-access-code"
          name="accessCode"
          inputMode="text"
          autoComplete="one-time-code"
          spellCheck={false}
          placeholder="ENTER CODE"
          value={code}
          onChange={(event) => {
            setCode(sanitiseAccessCode(event.target.value));
            if (error) setError("");
            if (submitStatus !== "idle" && submitStatus !== "loading") {
              setSubmitStatus("idle");
            }
          }}
          disabled={disabled || submitStatus === "loading"}
          className={codeClass}
        />
        <p className={cn("text-xs leading-5", muted)}>
          Works for remote and in-person sessions. Codes expire 24 hours after they are issued.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="join-display-name" className={labelClass}>
          Your name
        </Label>
        <Input
          id="join-display-name"
          autoComplete="name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          disabled={disabled || submitStatus === "loading"}
          className={fieldClass}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="join-email" className={labelClass}>
          Email
        </Label>
        <Input
          id="join-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={disabled || submitStatus === "loading"}
          className={fieldClass}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="join-password" className={labelClass}>
          Password
        </Label>
        <div className="relative">
          <Input
            id="join-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={disabled || submitStatus === "loading"}
            className={cn(fieldClass, "pr-12")}
          />
          <button
            type="button"
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        <p className={cn("text-xs leading-5", muted)}>
          At least 12 characters. Remember it — you will need it again if you get
          signed out during the assessment.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="join-password-confirm" className={labelClass}>
          Confirm password
        </Label>
        <Input
          id="join-password-confirm"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          disabled={disabled || submitStatus === "loading"}
          className={fieldClass}
        />
      </div>

      {error && submitStatus !== "error" && submitStatus !== "invalid" ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <AnimatedSubmitButton
        type="submit"
        status={submitStatus}
        idleText="Create account and join"
        errorMessage={
          submitStatus === "error" || submitStatus === "invalid" ? error : undefined
        }
        disabled={disabled || submitStatus === "loading" || code.length < 4}
        panelVariant={panelVariant}
        className="w-full"
      />

      <p className={cn("text-center text-sm", muted)}>
        Already verified?{" "}
        <button
          type="button"
          className={cn(
            "font-medium underline-offset-4 hover:underline",
            "font-medium text-primary underline-offset-4 hover:underline",
          )}
          onClick={() => setStep("verify")}
        >
          Continue after verification
        </button>
        {" · "}
        <Link
          href="/auth/login"
          className={cn(
            "font-medium underline-offset-4 hover:underline",
            "font-medium text-primary underline-offset-4 hover:underline",
          )}
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
