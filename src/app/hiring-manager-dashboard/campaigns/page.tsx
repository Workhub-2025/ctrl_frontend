"use client";

import { useState } from "react";
import { FolderKanban, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HiringManagerCampaignsList } from "@/components/dashboard/hiring-manager-campaigns-list";
import { HiringManagerMasterWorkspace } from "@/components/dashboard/hiring-manager/hiring-manager-master-workspace";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { useHiringManagerPortal } from "@/hooks/use-hiring-manager-portal";

export default function HiringManagerCampaignsPage() {
  const { campaigns, campaignDetails, sessions } = useHiringManagerPortal();
  const [viewMode, setViewMode] = useState<"workspace" | "list">("workspace");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <HiringManagerPageHeader
        eyebrow="Campaign workspace"
        title="Campaigns"
        description="Manage campaign setup, delivery mode, candidate completion, and report readiness."
        icon={<FolderKanban className="h-5 w-5" aria-hidden="true" />}
        action={
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/20 p-1">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "workspace" ? "secondary" : "ghost"}
              className="h-8 gap-1.5 text-xs font-semibold"
              onClick={() => setViewMode("workspace")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Workspace View
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "list" ? "secondary" : "ghost"}
              className="h-8 gap-1.5 text-xs font-semibold"
              onClick={() => setViewMode("list")}
            >
              <List className="h-3.5 w-3.5" />
              List View
            </Button>
          </div>
        }
      />

      {viewMode === "workspace" ? (
        <HiringManagerMasterWorkspace
          campaigns={campaigns}
          campaignDetails={campaignDetails}
          sessions={sessions}
        />
      ) : (
        <HiringManagerCampaignsList />
      )}
    </div>
  );
}
