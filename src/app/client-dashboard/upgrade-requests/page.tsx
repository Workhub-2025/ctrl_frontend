import { ClientProductionPlaceholder } from "@/components/dashboard/client-production-placeholder";
import { TrendingUp } from "lucide-react";

export default function ClientUpgradeRequestsPage() {
  return (
    <ClientProductionPlaceholder
      eyebrow="Upgrade requests"
      title="Upgrade Requests"
      description="Seat, assessment, and entitlement upgrade requests will be available here."
      icon={TrendingUp}
    />
  );
}
