"use client";

import { TotpSecurityPanel } from "@/components/account/totp-security-panel";
import { FirebaseTotpSecurityPanel } from "@/components/account/firebase-totp-security-panel";
import { isFirebaseAuthProvider } from "@/lib/auth/auth-provider";

export function AccountSecurityPanel({
  continueHref,
}: Readonly<{ continueHref: string }>) {
  if (isFirebaseAuthProvider()) {
    return <FirebaseTotpSecurityPanel continueHref={continueHref} />;
  }
  return <TotpSecurityPanel continueHref={continueHref} />;
}
