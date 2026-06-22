"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useHiringManagerPortal } from "@/hooks/use-hiring-manager-portal";
import {
  CandidateResultsDialog,
  HiringManagerSessionDetailsDialog,
  type ResultsDialogState,
} from "@/components/dashboard/hiring-manager-session-details-dialog";
import { HiringManagerPortalClientService } from "@/services/hiring-manager-portal-client.service";
import { portalAlertErrorClass, portalPanelNestedClass } from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import type { HiringManagerSessionListItem } from "@/services/hiring-manager-portal-client.service";

type HiringManagerSessionDetailViewProps = {
  sessionId: string;
};

function findCampaignForSession(
  session: HiringManagerSessionListItem,
  campaignDetails: ReturnType<typeof useHiringManagerPortal>["campaignDetails"]
) {
  return (
    campaignDetails.find(
      (campaign) =>
        campaign.assessmentSessions.some((item) => item.id === session.id) ||
        campaign.name === session.campaign
    ) ?? null
  );
}

export function HiringManagerSessionDetailView({ sessionId }: HiringManagerSessionDetailViewProps) {
  const router = useRouter();
  const { sessions, campaignDetails, loading, error, loadOverview } = useHiringManagerPortal();
  const [removingCandidateId, setRemovingCandidateId] = useState<string | null>(null);
  const [unlockingCandidateId, setUnlockingCandidateId] = useState<string | null>(null);
  const [updatingSessionId, setUpdatingSessionId] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resultsDialog, setResultsDialog] = useState<ResultsDialogState | null>(null);

  const session = useMemo(
    () => sessions.find((item) => item.id === sessionId) ?? null,
    [sessionId, sessions]
  );
  const campaign = useMemo(
    () => (session ? findCampaignForSession(session, campaignDetails) : null),
    [campaignDetails, session]
  );

  const refresh = async () => {
    await loadOverview(true);
  };

  const removeCandidate = async (assessmentSessionId: string, candidateSessionId: string) => {
    const reason = window.prompt("Enter the reason for removing this candidate from the session.");
    if (!reason?.trim()) return;

    setActionError(null);
    setRemovingCandidateId(candidateSessionId);
    try {
      await HiringManagerPortalClientService.removeCandidateFromSession({
        sessionId: assessmentSessionId,
        candidateSessionId,
        reason: reason.trim(),
      });
      await refresh();
    } catch (removeError) {
      setActionError(
        removeError instanceof Error ? removeError.message : "Candidate could not be removed."
      );
    } finally {
      setRemovingCandidateId(null);
    }
  };

  const deleteSession = async (assessmentSessionId: string) => {
    const confirmed = window.confirm(
      `Delete this session? This cannot be undone. Only empty sessions can be deleted.`
    );
    if (!confirmed) return;

    setActionError(null);
    setDeletingSessionId(assessmentSessionId);
    try {
      await HiringManagerPortalClientService.deleteSession(assessmentSessionId);
      router.push("/hiring-manager-dashboard/sessions/");
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error ? deleteError.message : "Session could not be deleted."
      );
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleUnlockCandidate = async (candidateSessionId: string) => {
    setUnlockingCandidateId(candidateSessionId);
    setActionError(null);
    try {
      await HiringManagerPortalClientService.unlockCandidate(candidateSessionId);
      await refresh();
    } catch (unlockError) {
      setActionError(
        unlockError instanceof Error
          ? unlockError.message
          : "Candidate session could not be unlocked."
      );
    } finally {
      setUnlockingCandidateId(null);
    }
  };

  const handleUpdateSessionStatus = async (assessmentSessionId: string, status: "closed") => {
    setUpdatingSessionId(assessmentSessionId);
    try {
      const success = await HiringManagerPortalClientService.updateSessionStatus(assessmentSessionId, status);
      if (success) {
        await refresh();
      }
    } finally {
      setUpdatingSessionId(null);
    }
  };

  if (loading && !session) {
    return (
      <div className={cn(portalPanelNestedClass, "rounded-lg p-6 text-sm text-muted-foreground")}>
        Loading session…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" className="h-9 rounded-lg" asChild>
          <Link href="/hiring-manager-dashboard/sessions/">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to sessions
          </Link>
        </Button>
        <div className={cn(portalAlertErrorClass, "text-sm")}>
          {error || "Session could not be found."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <Button variant="outline" size="sm" className="h-8 w-fit rounded-lg" asChild>
        <Link href="/hiring-manager-dashboard/sessions/">
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to sessions
        </Link>
      </Button>

      {actionError ? (
        <p className={cn(portalAlertErrorClass, "text-xs leading-5")}>{actionError}</p>
      ) : null}

      <HiringManagerSessionDetailsDialog
        session={session}
        open
        onOpenChange={() => router.push("/hiring-manager-dashboard/sessions/")}
        layout="page"
        campaignName={campaign?.name}
        campaignRole={campaign?.role}
        campaignId={campaign?.id}
        expectedAssessmentCount={campaign?.assessmentStack.length}
        removingCandidateId={removingCandidateId}
        onKickCandidate={removeCandidate}
        assessmentStack={campaign?.assessmentStack}
        onUnlockCandidate={handleUnlockCandidate}
        unlockingCandidateId={unlockingCandidateId}
        onUpdateSessionStatus={handleUpdateSessionStatus}
        updatingSessionId={updatingSessionId}
        onDeleteSession={deleteSession}
        deletingSessionId={deletingSessionId}
        onInvitesSent={refresh}
        onOpenResults={(candidate) =>
          setResultsDialog({
            candidateId: candidate.id,
            campaignId: campaign?.id ?? "",
            candidateSessionId: candidate.id,
            candidateName: candidate.name,
            candidateEmail: candidate.email,
            role: campaign?.role,
            campaignName: campaign?.name,
          })
        }
      />

      <CandidateResultsDialog
        resultsDialog={resultsDialog}
        onClose={() => setResultsDialog(null)}
      />
    </div>
  );
}
