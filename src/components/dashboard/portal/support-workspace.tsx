import type { ReactNode } from "react";
import { Headphones, MessageSquareText } from "lucide-react";
import { PortalEntityHeader } from "@/components/dashboard/portal/portal-data-ui";
import { portalPanelClass } from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";

export function SupportWorkspace({
  title = "Support",
  description,
  primaryAction,
  history,
  guidance,
}: Readonly<{
  title?: string;
  description: string;
  primaryAction: ReactNode;
  history: ReactNode;
  guidance?: ReactNode;
}>) {
  return (
    <div className="space-y-7">
      <PortalEntityHeader
        eyebrow="Help and adjustments"
        title={title}
        description={description}
        action={primaryAction}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="support-history-title" className="min-w-0 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 id="support-history-title" className="text-lg font-semibold text-foreground">
              Ticket history
            </h2>
          </div>
          {history}
        </section>
        {guidance ? (
          <aside
            aria-labelledby="support-guidance-title"
            className={cn(portalPanelClass, "h-fit p-5 xl:sticky xl:top-20")}
          >
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 id="support-guidance-title" className="text-sm font-semibold text-foreground">
                Before you raise a ticket
              </h2>
            </div>
            <div className="mt-3 text-sm leading-relaxed text-muted-foreground">{guidance}</div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
