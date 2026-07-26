"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHiringManagerPortal } from "@/hooks/use-hiring-manager-portal";
import {
  CandidateResultsDialog,
  HiringManagerSessionDetailsDialog,
  type ResultsDialogState,
} from "@/components/dashboard/hiring-manager-session-details-dialog";
import { HiringManagerPortalClientService } from "@/services/hiring-manager-portal-client.service";
import {
  PortalEntityHeader,
  PortalErrorState,
  PortalStatusBadge,
  PortalWorkQueue,
  type PortalWorkQueueItem,
} from "@/components/dashboard/portal/portal-data-ui";
import { PortalInlineLoading } from "@/components/dashboard/portal/portal-ui";
import { getHmSessionDisplayName } from "@/lib/hiring-manager/session-display";
import { usePortalBreadcrumbDetail } from "@/components/dashboard/portal/portal-shell";
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

export function HiringManagerSessionDetailView({
  sessionId,
}: HiringManagerSessionDetailViewProps) {
  const router = useRouter();
  const { sessions, campaignDetails, loading, error, loadOverview } =
    useHiringManagerPortal();
  const [removingCandidateId, setRemovingCandidateId] = useState<string | null>(
    null
  );
  const [unlockingCandidateId, setUnlockingCandidateId] = useState<
    string | null
  >(null);
  const [updatingSessionId, setUpdatingSessionId] = useState<string | null>(
    null
  );
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [resultsDialog, setResultsDialog] =
    useState<ResultsDialogState | null>(null);

  const session = useMemo(
    () => sessions.find((item) => item.id === sessionId) ?? null,
    [sessionId, sessions]
  );
  const campaign = useMemo(
    () => (session ? findCampaignForSession(session, campaignDetails) : null),
    [campaignDetails, session]
  );
  usePortalBreadcrumbDetail(session ? getHmSessionDisplayName(session) : null);

  const campaignSessionsHref = campaign
    ? `/hiring-manager-dashboard/campaigns/${encodeURIComponent(campaign.documentId ?? campaign.id)}?tab=sessions`
    : "/hiring-manager-dashboard/campaigns";

  const attentionItems = useMemo((): PortalWorkQueueItem[] => {
    if (!session) return [];
    const items: PortalWorkQueueItem[] = [];
    const locked = session.candidates.filter((c) => c.status === "locked");
    const incomplete = session.candidates.filter((c) => {
      const expected = campaign?.assessmentStack.length ?? 1;
      const done = c.results?.length ?? 0;
      return done < expected && c.status !== "locked";
    });

    if (session.candidateCount === 0) {
      items.push({
        id: "invite",
        title: "Invite candidates to this session",
        reason: "Use the invite panel below — join codes and email invites live here.",
        href: `#session-candidates`,
        actionLabel: "Scroll to invites",
        priority: "critical",
      });
    }

    if (locked.length > 0) {
      items.push({
        id: "unlock",
        title:
          locked.length === 1
            ? `${locked[0].name} is locked`
            : `${locked.length} candidates are locked`,
        reason: "Unlock so they can resume or continue assessments.",
        href: `#session-candidates`,
        actionLabel: "Review",
        priority: "attention",
      });
    }

    if (incomplete.length > 0) {
      items.push({
        id: "progress",
        title:
          incomplete.length === 1
            ? `${incomplete[0].name} still assessing`
            : `${incomplete.length} candidates still assessing`,
        reason: "Monitor progress or open a report when results land.",
        href: `#session-candidates`,
        actionLabel: "View roster",
        priority: "routine",
      });
    }

    return items;
  }, [session, campaign]);

  const refresh = async () => {
    await loadOverview(true);
  };

  const removeCandidate = async (
    assessmentSessionId: string,
    candidateSessionId: string
  ) => {
    const reason = window.prompt(
      "Enter the reason for removing this candidate from the session."
    );
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
        removeError instanceof Error
          ? removeError.message
          : "Candidate could not be removed."
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
      router.push(campaignSessionsHref);
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : "Session could not be deleted."
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

  const handleUpdateSessionStatus = async (
    assessmentSessionId: string,
    status: "closed"
  ) => {
    setUpdatingSessionId(assessmentSessionId);
    try {
      const success =
        await HiringManagerPortalClientService.updateSessionStatus(
          assessmentSessionId,
          status
        );
      if (success) {
        await refresh();
      }
    } finally {
      setUpdatingSessionId(null);
    }
  };

  if (loading && !session) {
    return <PortalInlineLoading message="Loading session…" />;
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <Button variant="outline" className="h-10 rounded-xl" asChild>
          <Link href="/hiring-manager-dashboard/campaigns/">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Back to campaigns
          </Link>
        </Button>
        <PortalErrorState
          title="Session not found"
          description={error || "This session could not be loaded."}
          onRetry={() => void loadOverview(true)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <Button variant="outline" className="h-10 w-fit rounded-xl" asChild>
        <Link href={campaignSessionsHref}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Back to campaign sessions
        </Link>
      </Button>

      <PortalEntityHeader
        eyebrow="Session workspace"
        title={getHmSessionDisplayName(session)}
        description={`${session.campaign} · ${session.date} · ${session.location}`}
        status={
          <>
            <PortalStatusBadge label={session.status} tone="active" />
            <PortalStatusBadge label={session.type} tone="neutral" />
          </>
        }
        metadata={[
          {
            label: "Joined",
            value: `${session.candidateCount} / ${session.candidateLimit}`,
          },
          { label: "Delivery", value: session.type },
        ]}
      />

      {actionError ? (
        <PortalErrorState title="Action failed" description={actionError} />
      ) : null}

      <PortalWorkQueue
        title="Session focus"
        description="Invite, unlock, or monitor — the actions that clear the path today."
        items={attentionItems}
        emptyTitle="Session roster is clear"
        emptyDescription="No locked or incomplete candidates need attention right now."
      />

      <div id="session-candidates">
        <HiringManagerSessionDetailsDialog
          session={session}
          open
          onOpenChange={() => router.push(campaignSessionsHref)}
          layout="page"
          campaignName={campaign?.name}
          campaignRole={campaign?.role}
          campaignId={campaign?.id}
          expectedAssessmentCount={campaign?.assessmentStack.length}
          removingCandidateId={removingCandidateId}
          onKickCandidate={removeCandidate}
          assessmentStack={campaign?.assessmentStack}
          assessmentSettings={campaign?.assessmentSettings}
          resolvedStackSummary={campaign?.resolvedStackSummary}
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
      </div>

      <CandidateResultsDialog
        resultsDialog={resultsDialog}
        onClose={() => setResultsDialog(null)}
      />
    </div>
  );
}
