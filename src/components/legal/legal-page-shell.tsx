"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
      <div className="mx-auto max-w-4xl">
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
              <Icon className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl font-headline">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
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
            <ScrollArea className="h-[600px] w-full rounded-md border p-6">
              <div className="space-y-6 text-sm">{children}</div>
            </ScrollArea>
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
      </div>
    </div>
  );
}
