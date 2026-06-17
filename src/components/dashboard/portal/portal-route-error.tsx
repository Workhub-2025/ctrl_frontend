"use client";

import { useEffect } from "react";
import { PortalAlert } from "@/components/dashboard/portal/portal-ui";
import { Button } from "@/components/ui/button";

export default function PortalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[portal-route-error]", error);
  }, [error]);

  return (
    <div className="space-y-4 p-1">
      <PortalAlert tone="error">
        {error.message || "This page could not be loaded. Try again."}
      </PortalAlert>
      <Button type="button" variant="outline" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
