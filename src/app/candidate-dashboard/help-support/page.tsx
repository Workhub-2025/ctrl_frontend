"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LifeBuoy, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CandidateEyebrow,
  CandidatePageHeader,
  CandidatePanel,
  CandidateSectionHeader,
} from "@/components/dashboard/candidate/candidate-portal-ui";
import { CreateTicketDialog } from "@/components/dashboard/create-ticket-dialog";
import { CandidateTicketHistory } from "@/components/dashboard/candidate-ticket-history";
import { candidateGuidanceItems } from "@/components/dashboard/candidate-dashboard-data";
import { portalIconWrapLgClass } from "@/components/dashboard/portal/portal-design-tokens";

function HelpSupportContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ticketDialogOpen, setTicketDialogOpen] = useState(
    () => searchParams.get("action") === "new-ticket"
  );
  const [ticketRefreshKey, setTicketRefreshKey] = useState(0);

  useEffect(() => {
    if (searchParams.get("action") === "new-ticket") {
      setTicketDialogOpen(true);
    }
  }, [searchParams]);

  const handleTicketDialogOpenChange = useCallback(
    (open: boolean) => {
      setTicketDialogOpen(open);
      if (!open && searchParams.get("action") === "new-ticket") {
        router.replace(pathname);
      }
    },
    [pathname, router, searchParams]
  );

  const handleTicketCreated = useCallback(() => {
    setTicketRefreshKey((key) => key + 1);
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <CandidatePageHeader
        eyebrow="Help & Support"
        title="Help & Support"
        description="Raise a technical ticket or browse common questions. Hiring team messages are sent from your linked assessment session."
        icon={LifeBuoy}
      />

      <section className="space-y-4">
        <CandidateSectionHeader
          eyebrow="Get help"
          title="Technical support"
          description="IT tickets are for platform issues. For role, scheduling, or process questions, open a session in My Assessments and use Message hiring team."
        />

        <CandidatePanel className="flex max-w-xl flex-col">
          <div className="flex flex-1 flex-col gap-4 p-6">
            <div className={portalIconWrapLgClass}>
              <Ticket className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <CandidateEyebrow>Technical support</CandidateEyebrow>
              <h2 className="font-display text-lg font-semibold">Raise an IT ticket</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Login problems, broken pages, assessment errors, or access code
                issues — our engineering desk will investigate.
              </p>
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>· You&apos;ll receive a ticket reference to track progress</li>
              <li>· Page context is attached automatically</li>
            </ul>
            <div className="mt-auto pt-2">
              <CreateTicketDialog
                open={ticketDialogOpen}
                onOpenChange={handleTicketDialogOpenChange}
                onSuccess={handleTicketCreated}
              >
                <Button className="h-10 w-full gap-2 rounded-xl font-semibold sm:w-auto">
                  <Ticket className="h-4 w-4" aria-hidden="true" />
                  Create IT ticket
                </Button>
              </CreateTicketDialog>
            </div>
          </div>
        </CandidatePanel>
      </section>

      <CandidateTicketHistory refreshKey={ticketRefreshKey} />

      <CandidatePanel>
        <div className="space-y-1 border-b border-border/40 p-5 dark:border-white/5">
          <CandidateEyebrow>Guidance</CandidateEyebrow>
          <h2 className="font-display text-base font-semibold">Common questions</h2>
          <p className="text-xs text-muted-foreground">
            Quick answers before you raise a ticket.
          </p>
        </div>
        <div className="p-5 pt-2">
          <Accordion type="single" collapsible className="w-full">
            {candidateGuidanceItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <AccordionItem
                  key={item.title}
                  value={`guidance-${index}`}
                  className="border-border/40 dark:border-white/5"
                >
                  <AccordionTrigger className="gap-3 text-left text-sm font-semibold hover:no-underline">
                    <span className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/55 bg-muted/40 text-primary">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      {item.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pl-11 text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </CandidatePanel>
    </div>
  );
}

function HelpSupportFallback() {
  return (
    <div className="mx-auto max-w-7xl space-y-6" aria-busy="true">
      <div className="h-28 animate-pulse rounded-2xl bg-muted/40" />
      <div className="h-56 max-w-xl animate-pulse rounded-2xl bg-muted/40" />
    </div>
  );
}

export default function HelpSupportPage() {
  return (
    <Suspense fallback={<HelpSupportFallback />}>
      <HelpSupportContent />
    </Suspense>
  );
}
