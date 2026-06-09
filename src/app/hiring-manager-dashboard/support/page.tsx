import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LifeBuoy, MailPlus, ShieldCheck } from "lucide-react";
import { hiringManagerSupport } from "@/components/dashboard/hiring-manager-dashboard-data";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";

export default function HiringManagerSupportPage() {
  return (
    <div className="max-w-7xl space-y-6">
      <HiringManagerPageHeader
        eyebrow="Support"
        title="Support"
        description="Get help with sessions, campaign setup, assessment guidance, and access requests."
        icon={LifeBuoy}
      />

      <div className="grid gap-3 lg:grid-cols-3">
        {hiringManagerSupport.map((item, index) => {
          const Icon = index === 0 ? LifeBuoy : index === 1 ? ShieldCheck : MailPlus;
          return (
            <Card
              key={item.title}
              className="rounded-[1.25rem] border border-border bg-card shadow-sm dark:border-white/5 dark:bg-[#080c16]/60 dark:shadow-none"
            >
              <CardHeader className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <CardTitle className="text-base text-foreground">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                <Button variant="outline">
                  Raise request
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
