import { ClientProductionPlaceholder } from "@/components/dashboard/client-production-placeholder";
import { Users } from "lucide-react";

export default function ClientHiringManagersPage() {
  return (
    <ClientProductionPlaceholder
      eyebrow="Hiring managers"
      title="Hiring Managers"
      description="Seat-level hiring-manager management will be available here."
      icon={Users}
    />
  );
}
