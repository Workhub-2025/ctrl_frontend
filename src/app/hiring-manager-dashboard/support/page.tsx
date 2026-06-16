"use client";

import { Button } from "@/components/ui/button";
import { LifeBuoy, MailPlus, ShieldCheck, Ticket } from "lucide-react";
import { hiringManagerSupport } from "@/components/dashboard/hiring-manager-dashboard-data";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { ContactFormDialog } from "@/components/dashboard/contact-form-dialog";
import { CreateTicketDialog } from "@/components/dashboard/create-ticket-dialog";
import {
  PortalEyebrow,
  PortalPanel,
  PortalSectionHeader,
  type PortalPanelAccent,
} from "@/components/dashboard/portal/portal-ui";

const supportConfig = [
  { recipient: "CTRL Support", subject: "Campaign Operations Support" },
  { recipient: "CTRL Support", subject: "Assessment Operations Query" },
  { recipient: "CTRL Support", subject: "Commercial Access Request" },
];

const supportAccents: PortalPanelAccent[] = ["primary", "session", "campaign"];
const supportIcons = [LifeBuoy, ShieldCheck, MailPlus];
const supportEyebrows = ["Operations", "Assessments", "Commercial"];

export default function HiringManagerSupportPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <HiringManagerPageHeader
        eyebrow="Support Desk"
        title="Support"
        description="Get help with sessions, campaign setup, assessment guidance, and access requests."
        icon={LifeBuoy}
        action={
          <CreateTicketDialog>
            <Button className="gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-primary text-white font-semibold text-sm hover:from-indigo-400 hover:to-primary/90 transition-all shadow-[0_4px_15px_rgba(99,102,241,0.15)]">
              <Ticket className="h-4 w-4" aria-hidden="true" />
              Create Ticket
            </Button>
          </CreateTicketDialog>
        }
      />

      <section className="space-y-4">
        <PortalSectionHeader
          eyebrow="Get help"
          title="Choose the right channel"
          description="Raise operational requests, assessment guidance queries, or commercial access needs."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {hiringManagerSupport.map((item, index) => {
            const Icon = supportIcons[index];
            const config = supportConfig[index];
            const accent = supportAccents[index];

            return (
              <PortalPanel key={item.title} accent={accent} className="flex flex-col">
                <div className="flex flex-1 flex-col gap-4 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-1.5">
                    <PortalEyebrow>{supportEyebrows[index]}</PortalEyebrow>
                    <h2 className="font-display text-lg font-semibold">{item.title}</h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <div className="mt-auto pt-2">
                    <ContactFormDialog
                      recipient={config.recipient}
                      defaultSubject={config.subject}
                      triggerVariant="outline"
                    >
                      <Button
                        variant="outline"
                        className="h-10 w-full gap-2 rounded-xl font-semibold"
                      >
                        Raise request
                      </Button>
                    </ContactFormDialog>
                  </div>
                </div>
              </PortalPanel>
            );
          })}
        </div>
      </section>
    </div>
  );
}
