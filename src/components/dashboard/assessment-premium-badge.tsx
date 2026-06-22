"use client";

import { Badge } from "@/components/ui/badge";
import { portalBadgeClass } from "@/components/dashboard/portal/portal-design-tokens";
import { isPremiumCatalogueTier } from "@/lib/client/entitlements";
import { cn } from "@/lib/utils";

export function AssessmentPremiumBadge({
  entitlementTier,
}: {
  entitlementTier?: string | null;
}) {
  if (!isPremiumCatalogueTier(entitlementTier)) {
    return null;
  }

  return (
    <Badge
      className={cn(
        "pointer-events-none shrink-0 rounded-md border-none px-2 py-0.5 text-[10px] font-semibold",
        portalBadgeClass
      )}
    >
      Premium
    </Badge>
  );
}
