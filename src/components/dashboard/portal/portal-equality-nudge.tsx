"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { canAccessEqualityMonitoring } from "@/lib/profile-authority";
import { UserProfileService } from "@/services/user-profile.service";
import { portalAlertWarningClass } from "@/components/dashboard/portal/portal-design-tokens";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SESSION_REDIRECT_KEY = "ctrl:equality-soft-prompt-seen";

function isEqualitySettled(profile: {
  hasCompletedEqualityMonitoring?: boolean;
  equalityPromptDismissedAt?: string | null;
  equalityMonitoring?: { completed?: boolean } | null;
}): boolean {
  if (profile.hasCompletedEqualityMonitoring === true) return true;
  if (profile.equalityMonitoring?.completed === true) return true;
  if (profile.equalityPromptDismissedAt) return true;
  return false;
}

/**
 * Soft first-session redirect + persistent orange nudge until the optional
 * equality survey is completed or explicitly dismissed (without marking completed).
 */
export function PortalEqualityNudge() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [showNudge, setShowNudge] = useState(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) {
      setShowNudge(false);
      return;
    }
    if (!canAccessEqualityMonitoring(user.role)) {
      setShowNudge(false);
      return;
    }
    if (pathname?.startsWith("/auth/equality-monitoring")) {
      setShowNudge(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      const profile = await UserProfileService.getProfile();
      if (cancelled) return;

      const settled = profile
        ? isEqualitySettled(profile)
        : Boolean(
            (user as { hasCompletedEqualityMonitoring?: boolean })
              .hasCompletedEqualityMonitoring ||
              (user.equalityMonitoring as { completed?: boolean } | undefined)
                ?.completed,
          );

      if (settled) {
        setShowNudge(false);
        return;
      }

      setShowNudge(true);

      try {
        if (typeof window !== "undefined" && !sessionStorage.getItem(SESSION_REDIRECT_KEY)) {
          sessionStorage.setItem(SESSION_REDIRECT_KEY, "1");
          router.push("/auth/equality-monitoring?optional=true");
        }
      } catch {
        // sessionStorage unavailable — keep banner only
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, user, pathname, router]);

  if (!showNudge) return null;

  return (
    <div
      className={cn(portalAlertWarningClass, "mb-4 flex flex-wrap items-center justify-between gap-3")}
      role="status"
    >
      <p className="text-sm leading-relaxed">
        Optional equality monitoring helps us check fairness. You can complete it
        now or skip — skipping does not count as survey completion.
      </p>
      <Button asChild size="sm" variant="outline" className="shrink-0 border-amber-600/50">
        <Link href="/auth/equality-monitoring?optional=true">Complete survey</Link>
      </Button>
    </div>
  );
}
