import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sessionGuideSteps } from "@/components/dashboard/hiring-manager-dashboard-data";
import { HiringManagerSessionsList } from "@/components/dashboard/hiring-manager-sessions-list";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { KeyRound, Layers3, ShieldCheck } from "lucide-react";

export default function HiringManagerSessionsPage() {
  return (
    <div className="max-w-7xl space-y-6">
      <HiringManagerPageHeader
        eyebrow="Session management"
        title="Sessions"
        description="Create sessions, issue access, and monitor delivery readiness."
        icon={Layers3}
        stats={[
          { icon: KeyRound, label: "Session codes" },
          { icon: ShieldCheck, label: "Audited removal" },
        ]}
      />

      <Card className="rounded-[1.25rem] border border-border bg-card shadow-sm dark:border-white/5 dark:bg-[#080c16]/60 dark:shadow-none">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Guided flow</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-3">
          {sessionGuideSteps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-xl border border-border bg-background p-4 shadow-sm dark:border-white/5 dark:bg-white/[0.03]"
            >
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Step 0{index + 1}
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">{step.title}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <HiringManagerSessionsList />
    </div>
  );
}
