import { ClientProductionPlaceholder } from "@/components/dashboard/client-production-placeholder";
import { MessageSquare } from "lucide-react";

export default function ClientMessagesPage() {
  return (
    <ClientProductionPlaceholder
      eyebrow="Messages"
      title="Messages"
      description="Client and hiring-manager communication tools will be available here."
      icon={MessageSquare}
    />
  );
}
