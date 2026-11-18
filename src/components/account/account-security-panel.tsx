"use client";

import { FirebaseTotpSecurityPanel } from "@/components/account/firebase-totp-security-panel";

export function AccountSecurityPanel({
  continueHref,
}: Readonly<{ continueHref: string }>) {
  return <FirebaseTotpSecurityPanel continueHref={continueHref} />;
}
