import { FolderKanban } from "lucide-react";
import { HiringManagerCampaignsList } from "@/components/dashboard/hiring-manager-campaigns-list";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";

export default function HiringManagerCampaignsPage() {
  return (
    <div className="max-w-7xl space-y-6">
      <HiringManagerPageHeader
        eyebrow="Campaign workspace"
        title="Campaigns"
        description="Manage campaign setup, delivery mode, candidate completion, and report readiness."
        icon={FolderKanban}
      />

      <HiringManagerCampaignsList />
    </div>
  );
}

