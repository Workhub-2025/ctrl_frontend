"use client";

import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithFirebase } from "@/lib/firebase-auth-browser";
import {
  parseInvitationEmail,
  parseInvitationLinkType,
  parseInvitationToken,
} from "@/lib/firebase-provisioning-contracts";
import { getPasswordPolicyIssue } from "@/lib/security/password-policy";

function invitationAcceptErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password" ||
      error.code === "auth/user-not-found"
    ) {
      return "Sign-in failed for this email. Use the invited email address and the password you just created, then try again.";
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

function InvitationAcceptanceContent() {
  const searchParams = useSearchParams();
  const invitationType = parseInvitationLinkType(searchParams.get("type"));
  const linkedEmail = parseInvitationEmail(searchParams.get("email"));
  const token = parseInvitationToken(searchParams.get("token")) ?? "";
  const isCandidateInvitation = invitationType === "candidate";
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState(linkedEmail ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const acceptInFlight = useRef(false);
  const linkIsComplete =
    Boolean(invitationType && token) &&
    (!isCandidateInvitation || Boolean(linkedEmail));

  const accept = async () => {
    if (acceptInFlight.current) return;
    acceptInFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const passwordIssue = getPasswordPolicyIssue(password, email);
      if (passwordIssue) throw new Error(passwordIssue);
      if (password !== passwordConfirmation) {
        throw new Error("Passwords do not match");
      }
      if (!linkIsComplete) {
        throw new Error("The invitation link is incomplete or invalid.");
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
        error?: string;
      };
      if (!provisioningResponse.ok) {
        throw new Error(provisioningBody.error ?? "Account could not be activated");
      }

      const login = await loginWithFirebase(email, password, {
        provisioningIntent: "invitation_acceptance",
      });
      if (login.requiresTotp) {
        throw new Error("This existing account requires sign-in verification before activation");
      }
      if (!login.session.provisioningRequired) {
        throw new Error("This Firebase account is already linked to an active platform user");
      }

      const acceptancePath = isCandidateInvitation
        ? "/api/assignments/invitations/accept"
        : "/api/invitations/accept";
      const response = await fetch(acceptancePath, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, displayName }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        data?: { redirectPath?: string };
        error?: string;
      };
      if (!response.ok || !body.data?.redirectPath) {
        throw new Error(body.error ?? "Invitation could not be accepted");
      }
      setPassword("");
      setPasswordConfirmation("");
      window.location.assign(body.data.redirectPath);
    } catch (acceptError) {
      setError(invitationAcceptErrorMessage(acceptError));
      setBusy(false);
      acceptInFlight.current = false;
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Accept your invitation</CardTitle>
          <CardDescription>
            {isCandidateInvitation
              ? "Create the Firebase account for the invited email, then activate your candidate assignment."
              : "Create the Firebase account for the invited email, then activate its organization membership."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          {!linkIsComplete ? <p role="alert" className="text-sm text-destructive">The invitation link is incomplete or invalid.</p> : null}
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
            <Label htmlFor="invitation-password">Create password</Label>
            <Input
              id="invitation-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
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
          <Button
            type="button"
            disabled={
              busy ||
              !linkIsComplete ||
              !email.trim() ||
              displayName.trim().length < 2 ||
              password.length < 12 ||
              passwordConfirmation.length < 12
            }
            onClick={() => void accept()}
          >
            {busy ? "Accepting invitation…" : "Accept invitation"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

export default function InvitationAcceptancePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <InvitationAcceptanceContent />
    </Suspense>
  );
}
