"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LifeBuoy, Mail, MessageSquare, Ticket } from "lucide-react";
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
import { ContactFormDialog } from "@/components/dashboard/contact-form-dialog";
import { CreateTicketDialog } from "@/components/dashboard/create-ticket-dialog";
import { CandidateTicketHistory } from "@/components/dashboard/candidate-ticket-history";
import { candidateGuidanceItems } from "@/components/dashboard/candidate-dashboard-data";

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
        description="Raise a technical ticket, message your hiring team, or browse common questions. All messages are tracked so you can follow up."
        icon={LifeBuoy}
      />

      <section className="space-y-4">
        <CandidateSectionHeader
          eyebrow="Get help"
          title="Choose the right channel"
          description="IT tickets are for platform issues. Hiring team messages are for process, scheduling, and role questions."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <CandidatePanel accent="primary" className="flex flex-col">
            <div className="flex flex-1 flex-col gap-4 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
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
                  <Button className="h-10 w-full gap-2 rounded-xl font-semibold">
                    <Ticket className="h-4 w-4" aria-hidden="true" />
                    Create IT ticket
                  </Button>
                </CreateTicketDialog>
              </div>
            </div>
          </CandidatePanel>

          <CandidatePanel accent="warning" className="flex flex-col">
            <div className="flex flex-1 flex-col gap-4 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300">
                <Mail className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="space-y-1.5">
                <CandidateEyebrow className="text-amber-600 dark:text-amber-400">
                  Hiring team
                </CandidateEyebrow>
                <h2 className="font-display text-lg font-semibold">Message hiring team</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Questions about the role, interview process, scheduling, venue, or
                  your application status.
                </p>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>· Delivered as a tracked message (not live chat)</li>
                <li>· Appears in your ticket history below</li>
              </ul>
              <div className="mt-auto pt-2">
                <ContactFormDialog
                  recipient="Hiring Manager"
                  defaultSubject="CTRL Candidate Query"
                  triggerVariant="outline"
                  onSuccess={handleTicketCreated}
                >
                  <Button
                    variant="outline"
                    className="h-10 w-full gap-2 rounded-xl border-amber-500/30 font-semibold dark:border-amber-500/25"
                  >
                    <MessageSquare className="h-4 w-4" aria-hidden="true" />
                    Send message
                  </Button>
                </ContactFormDialog>
              </div>
            </div>
          </CandidatePanel>
        </div>
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
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-56 animate-pulse rounded-2xl bg-muted/40" />
        <div className="h-56 animate-pulse rounded-2xl bg-muted/40" />
      </div>
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
