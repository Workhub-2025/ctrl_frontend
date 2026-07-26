"use client";

import { useState } from "react";
import { LayoutGrid, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HiringManagerCandidatesView } from "@/components/dashboard/hiring-manager-candidates-view";
import { HiringManagerMasterWorkspace } from "@/components/dashboard/hiring-manager/hiring-manager-master-workspace";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { useHiringManagerPortal } from "@/hooks/use-hiring-manager-portal";

export default function HiringManagerCandidatesPage() {
  const { campaigns, campaignDetails, sessions } = useHiringManagerPortal();
  const [viewMode, setViewMode] = useState<"workspace" | "roster">("workspace");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <HiringManagerPageHeader
        eyebrow="Candidate review"
        title="Candidates"
        description="Review candidate evidence, complete scores, integrity flags, and record outcome decisions."
        icon={<Users className="h-5 w-5" aria-hidden="true" />}
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
              variant={viewMode === "roster" ? "secondary" : "ghost"}
              className="h-8 gap-1.5 text-xs font-semibold"
              onClick={() => setViewMode("roster")}
            >
              <Users className="h-3.5 w-3.5" />
              Roster View
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
        <HiringManagerCandidatesView />
      )}
    </div>
  );
}
