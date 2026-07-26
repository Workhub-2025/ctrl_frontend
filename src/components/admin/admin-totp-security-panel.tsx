"use client";

import { AccountSecurityPanel } from "@/components/account/account-security-panel";

/** @deprecated Use AccountSecurityPanel at /profile?tab=security. */
export function AdminTotpSecurityPanel() {
  return <AccountSecurityPanel continueHref="/admin" />;
}
