import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sessionGuideSteps } from "@/components/dashboard/hiring-manager-dashboard-data";
import { HiringManagerSessionsList } from "@/components/dashboard/hiring-manager-sessions-list";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { KeyRound, Layers3, ShieldCheck } from "lucide-react";

export default function HiringManagerSessionsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <HiringManagerPageHeader
        eyebrow="Session management"
        title="Sessions"
        description="Create sessions, issue access, and monitor delivery readiness."
        icon={Layers3}
      />

      <HiringManagerSessionsList />
    </div>
  );
}
