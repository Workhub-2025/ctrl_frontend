"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { isInPersonTwoFactorPaused } from "@/lib/auth/in-person-two-factor-pause";
import { resolveAppRole } from "@/lib/auth/role-model";
import {
  getFirebaseTotpStatus,
  hasAuthenticatorBrowserSession,
} from "@/lib/firebase-totp-browser";
import { CandidateSessionService } from "@/services/candidate-session.service";
import { portalAlertWarningClass } from "@/components/dashboard/portal/portal-design-tokens";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function authenticatorAlreadyEnrolled(sessionTotpEnabled: boolean): boolean {
  if (sessionTotpEnabled) return true;
  try {
    if (!hasAuthenticatorBrowserSession()) return false;
    return getFirebaseTotpStatus().totpEnabled;
  } catch {
    return false;
  }
}

/**
 * Skippable 2FA reminder under the portal header. Hidden while an in-person
 * candidate still has unsubmitted assessments in that session.
 */
export function PortalMfaNudge() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) {
      setVisible(false);
      return;
    }
    if (pathname?.startsWith("/assessment/")) {
      setVisible(false);
      return;
    }
    const onSecurityTab =
      pathname === "/profile" &&
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("tab") === "security";
    if (onSecurityTab) {
      setVisible(false);
      return;
    }
    if (authenticatorAlreadyEnrolled(user.totpEnabled === true)) {
      setVisible(false);
      return;
    }

    const role = resolveAppRole(user.role);
    if (role !== "candidate") {
      setVisible(true);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const applications = await CandidateSessionService.getMyApplications();
        if (cancelled) return;
        setVisible(!isInPersonTwoFactorPaused(applications));
      } catch {
        if (!cancelled) setVisible(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, user, pathname]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        portalAlertWarningClass,
        "mb-4 flex flex-wrap items-center justify-between gap-3",
      )}
      role="status"
    >
      <p className="flex items-start gap-2 text-sm leading-relaxed">
        <Shield className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Enable two-factor authentication to secure your account.</span>
      </p>
      <Button asChild size="sm" variant="outline" className="shrink-0 border-amber-600/50">
        <Link href="/profile?tab=security&enroll=1">Set up now</Link>
      </Button>
    </div>
  );
}
