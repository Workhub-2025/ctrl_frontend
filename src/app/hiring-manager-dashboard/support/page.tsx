"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LifeBuoy, MailPlus, ShieldCheck, Ticket } from "lucide-react";
import { hiringManagerSupport } from "@/components/dashboard/hiring-manager-dashboard-data";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { cn } from "@/lib/utils";
import { ContactFormDialog } from "@/components/dashboard/contact-form-dialog";
import { CreateTicketDialog } from "@/components/dashboard/create-ticket-dialog";

const supportConfig = [
  { recipient: "CTRL Support", subject: "Campaign Operations Support" },
  { recipient: "CTRL Support", subject: "Assessment Operations Query" },
  { recipient: "CTRL Support", subject: "Commercial Access Request" },
];

export default function HiringManagerSupportPage() {
  return (
    <div className="max-w-7xl space-y-6">
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

      <div className="grid gap-4 lg:grid-cols-3">
        {hiringManagerSupport.map((item, index) => {
          const Icon = index === 0 ? LifeBuoy : index === 1 ? ShieldCheck : MailPlus;
          const gradient = index === 0 
            ? "from-primary to-indigo-500" 
            : index === 1 
            ? "from-blue-500 to-sky-400" 
            : "from-indigo-500 to-purple-400";
          const config = supportConfig[index];

          return (
            <Card
              key={item.title}
              className="relative overflow-hidden rounded-xl border border-border bg-card dark:border-white/10 dark:bg-[#0b1329]/40 dark:backdrop-blur-md shadow-lg p-5 flex flex-col justify-between min-h-[220px]"
            >
              <div className={cn("absolute top-0 left-0 w-1 h-full bg-gradient-to-b", gradient)} />
              <CardHeader className="space-y-3 p-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-0 pt-3 flex flex-col justify-between flex-grow">
                <p className="text-xs leading-relaxed text-slate-400">{item.description}</p>
                <ContactFormDialog
                  recipient={config.recipient}
                  defaultSubject={config.subject}
                  triggerVariant="outline"
                >
                  <Button variant="outline" className="w-full h-9 rounded-lg border-white/15 bg-white/[0.02] text-xs font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors">
                    Raise request
                  </Button>
                </ContactFormDialog>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
