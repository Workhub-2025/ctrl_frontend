import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarDays, FolderKanban, Plus, Users } from "lucide-react";
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
        action={
          <Button asChild>
            <Link href="/hiring-manager-dashboard/campaigns/create/?returnTo=/hiring-manager-dashboard/campaigns/">
              <Plus className="mr-2 h-4 w-4" />
              Create campaign
            </Link>
          </Button>
        }
      />

      <HiringManagerCampaignsList />
    </div>
  );
}
