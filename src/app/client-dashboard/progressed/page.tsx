import { ClientProductionPlaceholder } from "@/components/dashboard/client-production-placeholder";
import { ClipboardCheck } from "lucide-react";

export default function ClientApprovalsPage() {
  return (
    <ClientProductionPlaceholder
      eyebrow="Approvals"
      title="Approvals"
      description="Campaign and progressed-candidate approval workflows will be available here."
      icon={ClipboardCheck}
    />
  );
}
