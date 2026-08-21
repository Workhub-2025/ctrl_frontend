"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { AccessibilityDropdown } from "@/components/accessibility/accessibility-dropdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { loginWithFirebase } from "@/lib/firebase-auth-browser";
import {
  parseInvitationEmail,
  parseInvitationLinkType,
  parseInvitationToken,
} from "@/lib/firebase-provisioning-contracts";
import { getPasswordPolicyIssue } from "@/lib/security/password-policy";
import { cn } from "@/lib/utils";

type AcceptMode = "create" | "existing";

function invitationAcceptErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password" ||
      error.code === "auth/user-not-found"
    ) {
      return "Sign-in failed for this email. Use the invited email and its existing password.";
    }
    if (error.code === "auth/too-many-requests") {
      return "Too many sign-in attempts. Wait a moment and try again.";
    }
    if (error.code === "auth/network-request-failed") {
      return "Could not reach Firebase Authentication. Check your connection and try again.";
    }
  }
  return error instanceof Error ? error.message : "Invitation could not be accepted";
}

function buildInvitationCallbackPath(searchParams: URLSearchParams): string {
  const path = new URL("/auth/accept-invitation", "https://ctrl.invalid");
  for (const key of ["type", "token", "email"] as const) {
    const value = searchParams.get(key);
    if (value) path.searchParams.set(key, value);
  }
  return `${path.pathname}${path.search}`;
}

async function acceptInvitationWithSession(input: {
  token: string;
  displayName: string;
  isCandidateInvitation: boolean;
}): Promise<string> {
  const acceptancePath = input.isCandidateInvitation
    ? "/api/assignments/invitations/accept"
    : "/api/invitations/accept";
  const response = await fetch(acceptancePath, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ token: input.token, displayName: input.displayName }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    data?: { redirectPath?: string };
    error?: string;
  };
  if (!response.ok || !body.data?.redirectPath) {
    throw new Error(body.error ?? "Invitation could not be accepted");
  }
  return body.data.redirectPath;
}

function InvitationAcceptanceContent() {
  const searchParams = useSearchParams();
  const { settings, updateSettings, resetSettings, themeClassName } =
    useAccessibilitySettings();
  const invitationType = parseInvitationLinkType(searchParams.get("type"));
  const linkedEmail = parseInvitationEmail(searchParams.get("email"));
  const token = parseInvitationToken(searchParams.get("token")) ?? "";
  const isCandidateInvitation = invitationType === "candidate";
  const isAdminInvitation = invitationType === "admin";
  const [mode, setMode] = useState<AcceptMode>("create");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState(linkedEmail ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const acceptInFlight = useRef(false);
  const resumeAttempted = useRef(false);
  const linkIsComplete =
    Boolean(invitationType && token) &&
    (invitationType === "organization" || Boolean(linkedEmail));

  const completeAfterSignIn = async (signedInEmail: string) => {
    const name =
      displayName.trim() ||
      signedInEmail.split("@")[0]?.replace(/[._-]+/g, " ") ||
      "Invited user";
    const redirectPath = await acceptInvitationWithSession({
      token,
      displayName: name,
      isCandidateInvitation,
    });
    setPassword("");
    setPasswordConfirmation("");
    window.location.assign(redirectPath);
  };

  useEffect(() => {
    if (!linkIsComplete || resumeAttempted.current || acceptInFlight.current) {
      return;
    }
    resumeAttempted.current = true;
    let cancelled = false;
    void (async () => {
      try {
        // Resume after login: Firebase session cookie is enough for accept BFF.
        const probe = await fetch("/api/auth/session", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!probe.ok || cancelled) return;
        const sessionBody = (await probe.json().catch(() => null)) as {
          user?: { email?: string | null };
        } | null;
        const sessionEmail = sessionBody?.user?.email?.trim().toLowerCase();
        if (!sessionEmail) return;
        if (linkedEmail && sessionEmail !== linkedEmail) {
          if (!cancelled) {
            setError(
              "You are signed in as a different email than this invitation. Sign out, then continue with the invited address.",
            );
          }
          return;
        }
        if (!cancelled) {
          setBusy(true);
          setInfo("Signed-in session found. Completing invitation…");
        }
        acceptInFlight.current = true;
        await completeAfterSignIn(sessionEmail);
      } catch (resumeError) {
        if (!cancelled) {
          setError(invitationAcceptErrorMessage(resumeError));
          setBusy(false);
          setInfo(null);
          acceptInFlight.current = false;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally once on mount for resume-after-sign-in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkIsComplete]);

  const accept = async () => {
    if (acceptInFlight.current) return;
    acceptInFlight.current = true;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (!linkIsComplete) {
        throw new Error("The invitation link is incomplete or invalid.");
      }
      if (!displayName.trim()) {
        throw new Error("Enter the name that should appear on your account.");
      }

      if (mode === "existing") {
        const login = await loginWithFirebase(email, password, {
          provisioningIntent: "invitation_acceptance",
        });
        if (login.requiresTotp) {
          throw new Error(
            "This account requires sign-in verification before activation. Complete MFA on the login page, then reopen this invitation link.",
          );
        }
        await completeAfterSignIn(email.trim().toLowerCase());
        return;
      }

      const passwordIssue = getPasswordPolicyIssue(password, email);
      if (passwordIssue) throw new Error(passwordIssue);
      if (password !== passwordConfirmation) {
        throw new Error("Passwords do not match");
      }

      const provisioningPath = isCandidateInvitation
        ? "/api/onboarding/candidate-account"
        : "/api/onboarding/firebase-account";
      const provisioningResponse = await fetch(provisioningPath, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, email, password, displayName }),
      });
      const provisioningBody = (await provisioningResponse.json().catch(() => ({}))) as {
        data?: { requiresExistingSignIn?: boolean };
        error?: string;
      };
      if (!provisioningResponse.ok) {
        throw new Error(provisioningBody.error ?? "Account could not be activated");
      }
      if (provisioningBody.data?.requiresExistingSignIn) {
        setMode("existing");
        setPassword("");
        setPasswordConfirmation("");
        setInfo(
          "An account already exists for this email. Sign in with its existing password to finish accepting the invitation.",
        );
        setBusy(false);
        acceptInFlight.current = false;
        return;
      }

      const login = await loginWithFirebase(email, password, {
        provisioningIntent: "invitation_acceptance",
      });
      if (login.requiresTotp) {
        throw new Error(
          "This account requires sign-in verification before activation. Complete MFA, then reopen this invitation link.",
        );
      }

      await completeAfterSignIn(email.trim().toLowerCase());
    } catch (acceptError) {
      setError(invitationAcceptErrorMessage(acceptError));
      setBusy(false);
      acceptInFlight.current = false;
    }
  };

  const loginHref = (() => {
    const callback = buildInvitationCallbackPath(searchParams);
    const url = new URL("/auth/login", "https://ctrl.invalid");
    url.searchParams.set("callbackUrl", callback);
    if (email) url.searchParams.set("email", email);
    return `${url.pathname}${url.search}`;
  })();

  return (
    <main
      className={cn(
        "relative mx-auto flex min-h-screen w-full max-w-xl items-center bg-background px-6 py-12 text-foreground",
        themeClassName,
      )}
    >
      <div className="absolute right-6 top-6 z-50">
        <AccessibilityDropdown
          settings={settings}
          updateSettings={updateSettings}
          resetSettings={resetSettings}
        />
      </div>
      <Card className="w-full border-border bg-card">
        <CardHeader>
          <CardTitle>Accept your invitation</CardTitle>
          <CardDescription>
            {mode === "existing"
              ? "Sign in with the existing password for this email, then we will attach the invitation."
              : isCandidateInvitation
                ? "Create the Firebase account for the invited email, then activate your candidate assignment."
                : isAdminInvitation
                  ? "Create your password for the invited email, then activate CTRL Admin."
                  : "Create the Firebase account for the invited email, then activate its organisation membership."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          {info ? <p role="status" className="text-sm text-muted-foreground">{info}</p> : null}
          {!linkIsComplete ? (
            <p role="alert" className="text-sm text-destructive">
              The invitation link is incomplete or invalid.
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="invitation-display-name">Your name</Label>
            <Input
              id="invitation-display-name"
              autoComplete="name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invitation-email">Invited email address</Label>
            <Input
              id="invitation-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              readOnly={Boolean(linkedEmail)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invitation-password">
              {mode === "existing" ? "Existing password" : "Create password"}
            </Label>
            <Input
              id="invitation-password"
              type="password"
              autoComplete={mode === "existing" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {mode === "create" ? (
            <div className="space-y-2">
              <Label htmlFor="invitation-password-confirmation">Confirm password</Label>
              <Input
                id="invitation-password-confirmation"
                type="password"
                autoComplete="new-password"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
              />
            </div>
          ) : null}
          <Button
            type="button"
            className="w-full"
            disabled={busy || !linkIsComplete}
            onClick={() => void accept()}
          >
            {busy
              ? "Working…"
              : mode === "existing"
                ? "Sign in and accept invitation"
                : "Create account and accept"}
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline"
              disabled={busy}
              onClick={() => {
                setMode((current) => (current === "create" ? "existing" : "create"));
                setError(null);
                setInfo(null);
                setPassword("");
                setPasswordConfirmation("");
              }}
            >
              {mode === "existing"
                ? "Need to create a new password instead?"
                : "Already have an account? Sign in to accept"}
            </button>
            <Link href={loginHref} className="text-muted-foreground underline-offset-4 hover:underline">
              Open login page
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-12">
          <p className="text-sm text-muted-foreground">Loading invitation…</p>
        </main>
      }
    >
      <InvitationAcceptanceContent />
    </Suspense>
  );
}
