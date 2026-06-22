"use client";

import { useCallback, useState } from "react";
import { LifeBuoy, MessageSquare, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { ContactFormDialog } from "@/components/dashboard/contact-form-dialog";
import { CreateTicketDialog } from "@/components/dashboard/create-ticket-dialog";
import { CandidateTicketHistory } from "@/components/dashboard/candidate-ticket-history";

export default function HiringManagerSupportPage() {
  const [ticketRefreshKey, setTicketRefreshKey] = useState(0);

  const handleTicketCreated = useCallback(() => {
    setTicketRefreshKey((key) => key + 1);
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <HiringManagerPageHeader
        eyebrow="Support Desk"
        title="Support"
        description="Raise and track support tickets for sessions, campaigns, assessments, and access requests."
        icon={LifeBuoy}
      />

      <CandidateTicketHistory
        refreshKey={ticketRefreshKey}
        showContactBadge={false}
        labels={{
          sectionEyebrow: "Your tickets",
          sectionTitle: "Support ticket history",
          sectionDescriptionOpen: (count) =>
            `${count} open ticket${count !== 1 ? "s" : ""} — select a row for the full thread.`,
          sectionDescriptionEmpty:
            "All support tickets and CTRL messages in one place.",
          emptyTitle: "No support tickets yet",
          emptyDescription:
            "Create a ticket for platform issues or send a message to CTRL Support. Updates and replies appear here.",
          historyLabel: "Tickets",
        }}
        headerActions={
          <>
            <CreateTicketDialog onSuccess={handleTicketCreated}>
              <Button className="h-9 gap-2 rounded-xl text-xs font-semibold">
                <Ticket className="h-3.5 w-3.5" aria-hidden="true" />
                Create ticket
              </Button>
            </CreateTicketDialog>
            <ContactFormDialog
              recipient="CTRL Support"
              defaultSubject="Hiring manager support request"
              triggerVariant="outline"
              onSuccess={handleTicketCreated}
            >
              <Button
                variant="outline"
                className="h-9 gap-2 rounded-xl text-xs font-semibold"
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                Message support
              </Button>
            </ContactFormDialog>
          </>
        }
      />
    </div>
  );
}
