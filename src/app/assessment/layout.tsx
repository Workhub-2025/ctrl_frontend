"use client";

import { ProtectedLayout } from "@/components/auth/protected-layout";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { cn } from "@/lib/utils";

export default function AssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Hook in the accessibility settings and apply the active theme's background class
  // and the ctrl-portal wrapper class.
  const { themeClassName } = useAccessibilitySettings({ enabled: true });

  return (
    <ProtectedLayout>
      <div className={cn("ctrl-portal selection:bg-primary/30 min-h-screen", themeClassName)}>
        {children}
      </div>
    </ProtectedLayout>
  );
}