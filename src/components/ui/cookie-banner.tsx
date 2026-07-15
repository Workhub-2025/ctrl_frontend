"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const STORAGE_NOTICE_KEY = "ctrl-storage-notice-dismissed-at";
const LEGACY_CONSENT_KEY = "cookie-consent";

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    try {
      const hasSeenNotice = Boolean(
        window.localStorage.getItem(STORAGE_NOTICE_KEY)
        || window.localStorage.getItem(LEGACY_CONSENT_KEY),
      );
      setShowBanner(!hasSeenNotice);
    } catch {
      setShowBanner(true);
    }
  }, []);

  const dismissNotice = () => {
    try {
      window.localStorage.setItem(STORAGE_NOTICE_KEY, new Date().toISOString());
    } catch {
      // The notice can still be dismissed for this page view when storage is unavailable.
    }
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <aside
      aria-label="Cookie and local storage notice"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <Card className="mx-auto max-w-4xl border border-border bg-background shadow-xl">
        <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">Necessary storage only</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              CTRL uses cookies and local storage for secure sign-in, assessment continuity,
              accessibility preferences and fraud prevention. We do not currently use analytics
              or advertising cookies.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" onClick={dismissNotice}>
                Continue
              </Button>
              <Button asChild type="button" size="sm" variant="outline">
                <Link href="/cookie-policy">Read storage policy</Link>
              </Button>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={dismissNotice}
            aria-label="Dismiss storage notice"
            className="h-10 w-10 shrink-0"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </Card>
    </aside>
  );
}
