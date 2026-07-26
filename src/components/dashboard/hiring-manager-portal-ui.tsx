"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PortalAlert,
  PortalPageHeader,
} from "@/components/dashboard/portal/portal-ui";
import { cn } from "@/lib/utils";

export const HmPageHeader = PortalPageHeader;

export function HmErrorBanner({
  message,
  children,
  tone = "error",
}: {
  message?: string;
  children?: React.ReactNode;
  tone?: "error" | "warning" | "info";
}) {
  return <PortalAlert tone={tone}>{message ?? children}</PortalAlert>;
}

export function HmRefreshButton({
  onClick,
  loading,
  label = "Refresh",
}: {
  onClick: () => void;
  loading?: boolean;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-9 rounded-lg"
      onClick={onClick}
      disabled={loading}
    >
      <RefreshCw
        className={cn("mr-2 h-4 w-4", loading && "motion-safe:animate-spin text-primary")}
        aria-hidden="true"
      />
      {label}
    </Button>
  );
}
