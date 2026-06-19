"use client";

import { useCallback, useState } from "react";
import { LifeBuoy, Mail, MessageSquare, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientPageHeader } from "@/components/dashboard/client/client-portal-ui";
import { ContactFormDialog } from "@/components/dashboard/contact-form-dialog";
import { CreateTicketDialog } from "@/components/dashboard/create-ticket-dialog";
import { CandidateTicketHistory } from "@/components/dashboard/candidate-ticket-history";
import {
  PortalEyebrow,
  PortalPanel,
  PortalSectionHeader,
  portalBadgeClass,
} from "@/components/dashboard/portal/portal-ui";
import { portalIconWrapLgClass } from "@/components/dashboard/portal/portal-design-tokens";

export function ClientMessagesContent() {
  const [ticketRefreshKey, setTicketRefreshKey] = useState(0);

  const handleTicketCreated = useCallback(() => {
    setTicketRefreshKey((key) => key + 1);
  }, []);

  return (
    <div className="relative mx-auto max-w-7xl space-y-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <ClientPageHeader
        title="Messages"
        description="Raise a support ticket or message CTRL Support. All messages are tracked so you can follow up."
      />

      <section className="space-y-4">
        <PortalSectionHeader
          eyebrow="Get help"
          title="Choose the right channel"
          description="Use upgrade requests for seats, delivery methods, or assessment add-ons. Raise a ticket here for platform issues or account questions."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <PortalPanel className="flex flex-col">
            <div className="flex flex-1 flex-col gap-4 p-6">
              <div className={portalIconWrapLgClass}>
                <Ticket className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="space-y-1.5">
                <PortalEyebrow>Technical support</PortalEyebrow>
                <h2 className="font-display text-lg font-semibold">Raise a support ticket</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Login problems, broken pages, access issues, or platform errors — our support
                  desk will investigate.
                </p>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>· You&apos;ll receive a ticket reference to track progress</li>
                <li>· Page context is attached automatically</li>
              </ul>
              <div className="mt-auto pt-2">
                <CreateTicketDialog onSuccess={handleTicketCreated}>
                  <Button className="h-10 w-full gap-2 rounded-xl font-semibold">
                    <Ticket className="h-4 w-4" aria-hidden="true" />
                    Create support ticket
                  </Button>
                </CreateTicketDialog>
              </div>
            </div>
          </PortalPanel>

          <PortalPanel className="flex flex-col">
            <div className="flex flex-1 flex-col gap-4 p-6">
              <div className={portalIconWrapLgClass}>
                <Mail className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="space-y-1.5">
                <PortalEyebrow>Account support</PortalEyebrow>
                <h2 className="font-display text-lg font-semibold">Message CTRL Support</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Questions about your contract, seats, billing, or account configuration.
                </p>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>· Delivered as a tracked message (not live chat)</li>
                <li>· Appears in your ticket history below</li>
              </ul>
              <div className="mt-auto pt-2">
                <ContactFormDialog
                  recipient="CTRL Support"
                  defaultSubject="CTRL Client Query"
                  triggerVariant="outline"
                  onSuccess={handleTicketCreated}
                >
                  <Button
                    variant="outline"
                    className="h-10 w-full gap-2 rounded-xl font-semibold"
                  >
                    <MessageSquare className="h-4 w-4" aria-hidden="true" />
                    Send message
                  </Button>
                </ContactFormDialog>
              </div>
            </div>
          </PortalPanel>
        </div>
      </section>

      <CandidateTicketHistory refreshKey={ticketRefreshKey} />
    </div>
  );
}
