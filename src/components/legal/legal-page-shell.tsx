"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { AccessibilityDropdown } from "@/components/accessibility/accessibility-dropdown";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { UK_LEGAL, formatUkDate } from "@/lib/legal/uk-compliance";

type LegalPageShellProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  iconClassName?: string;
  version?: string;
  children: React.ReactNode;
};

export function LegalPageShell({
  title,
  description,
  icon: Icon,
  iconClassName = "bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400",
  version,
  children,
}: LegalPageShellProps) {
  const {
    settings: accessibilitySettings,
    updateSettings: updateAccessibilitySettings,
    resetSettings: resetAccessibilitySettings,
  } = useAccessibilitySettings();

  return (
    <div className="min-h-screen bg-background p-4">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl focus:outline-none">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <AccessibilityDropdown
            settings={accessibilitySettings}
            updateSettings={updateAccessibilitySettings}
            resetSettings={resetAccessibilitySettings}
          />
        </div>

        <Card>
          <CardHeader className="text-center">
            <div
              className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${iconClassName}`}
            >
              <Icon className="h-8 w-8" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-semibold leading-none tracking-tight font-headline">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">{description}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Last updated: {formatUkDate(UK_LEGAL.lastUpdated)}
              {version ? (
                <>
                  <br />
                  Version: {version}
                </>
              ) : null}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 rounded-md border p-4 text-sm leading-6 sm:p-6">
              {children}
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/privacy-policy" className="hover:underline">
            Privacy Policy
          </Link>
          {" · "}
          <Link href="/terms-conditions" className="hover:underline">
            Terms &amp; Conditions
          </Link>
          {" · "}
          <Link href="/sub-processors" className="hover:underline">
            Sub-processors
          </Link>
          {" · "}
          <Link href="/accessibility-statement" className="hover:underline">
            Accessibility
          </Link>
          {" · "}
          <Link href="/data-processing-agreement" className="hover:underline">
            DPA
          </Link>
        </p>
      </main>
    </div>
  );
}
