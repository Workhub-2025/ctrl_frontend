"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ClientAccessCode,
  ClientCampaignApprovalItem,
  ClientContract,
  ClientDashboardSummary,
  ClientHiringManagerSeat,
  ClientSharedCandidate,
} from "@/services/client-portal.service";

export type ClientOverviewData = {
  summary: ClientDashboardSummary | null;
  campaigns: ClientCampaignApprovalItem[];
  accessCodes: ClientAccessCode[];
  hiringManagers: ClientHiringManagerSeat[];
};

export type SeatSlot =
  | { type: "occupied"; label: string; manager: ClientHiringManagerSeat }
  | { type: "empty"; label: string; accessCode?: ClientAccessCode };

const CACHE_TTL_MS = 30_000;
let overviewCache: { data: ClientOverviewData; timestamp: number } | null = null;
let overviewInFlight: Promise<ClientOverviewData> | null = null;

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((body as { error?: string }).error || `Request failed (${response.status})`);
  }
  return body as T;
}

async function fetchOverview(force = false): Promise<ClientOverviewData> {
  const now = Date.now();
  if (!force && overviewCache && now - overviewCache.timestamp < CACHE_TTL_MS) {
    return overviewCache.data;
  }
  if (!force && overviewInFlight) return overviewInFlight;

  overviewInFlight = fetch("/api/client/overview", { cache: "no-store" })
    .then((response) => readJson<{ data?: ClientOverviewData }>(response))
    .then((body) => {
      if (!body.data) throw new Error("Client overview could not be loaded");
      overviewCache = { data: body.data, timestamp: Date.now() };
      return body.data;
    })
    .finally(() => {
      overviewInFlight = null;
    });

  return overviewInFlight;
}

export function invalidateClientOverviewCache() {
  overviewCache = null;
}

export function useClientPortal() {
  const [summary, setSummary] = useState<ClientDashboardSummary | null>(null);
  const [campaigns, setCampaigns] = useState<ClientCampaignApprovalItem[]>([]);
  const [accessCodes, setAccessCodes] = useState<ClientAccessCode[]>([]);
  const [hiringManagers, setHiringManagers] = useState<ClientHiringManagerSeat[]>([]);
  const [sharedCandidates, setSharedCandidates] = useState<ClientSharedCandidate[]>([]);
  const [contract, setContract] = useState<ClientContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [contractLoading, setContractLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewingCandidateId, setReviewingCandidateId] = useState<string | null>(null);
  const [codeBusy, setCodeBusy] = useState<string | null>(null);
  const [releasingManagerId, setReleasingManagerId] = useState<string | null>(null);
  const [approvalModeBusy, setApprovalModeBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingCampaigns = useMemo(
    () => campaigns.filter((c) => c.approvalStatus === "Pending approval"),
    [campaigns]
  );

  const activeHiringManagers = useMemo(
    () => hiringManagers.filter((m) => m.status !== "previous"),
    [hiringManagers]
  );

  const previousHiringManagers = useMemo(
    () => hiringManagers.filter((m) => m.status === "previous"),
    [hiringManagers]
  );

  const pendingSharedCandidates = useMemo(
    () => sharedCandidates.filter((c) => c.reviewStatus === "pending_review"),
    [sharedCandidates]
  );

  const seatSlots = useMemo<SeatSlot[]>(() => {
    const occupied = activeHiringManagers.map((manager, index) => ({
      type: "occupied" as const,
      label: `Seat ${index + 1}`,
      manager,
    }));
    const emptyCount = Math.max(0, (summary?.seats.limit ?? 0) - occupied.length);
    const empty = Array.from({ length: emptyCount }, (_, index) => ({
      type: "empty" as const,
      label: `Seat ${occupied.length + index + 1}`,
      accessCode: accessCodes[index],
    }));
    return [...occupied, ...empty];
  }, [accessCodes, activeHiringManagers, summary?.seats.limit]);

  const loadOverview = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const overview = await fetchOverview(force);
      setSummary(overview.summary);
      setCampaigns(overview.campaigns);
      setAccessCodes(overview.accessCodes);
      setHiringManagers(overview.hiringManagers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Client dashboard could not be loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSharedCandidates = useCallback(async (reviewStatus?: string) => {
    setSharedLoading(true);
    setError(null);
    try {
      const query = reviewStatus ? `?reviewStatus=${encodeURIComponent(reviewStatus)}` : "";
      const body = await fetch(`/api/client/shared-candidates${query}`, {
        cache: "no-store",
      }).then((r) => readJson<{ data?: ClientSharedCandidate[] }>(r));
      setSharedCandidates(body.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Shared candidates could not be loaded");
    } finally {
      setSharedLoading(false);
    }
  }, []);

  const loadContract = useCallback(async () => {
    setContractLoading(true);
    setError(null);
    try {
      const body = await fetch("/api/client/contract", { cache: "no-store" }).then((r) =>
        readJson<{ data?: { contract?: ClientContract | null } }>(r)
      );
      setContract(body.data?.contract ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Contract could not be loaded");
    } finally {
      setContractLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const reviewCampaign = async (campaignId: string, decision: "approved" | "rejected") => {
    setReviewingId(campaignId);
    try {
      await fetch(`/api/client/campaign-approvals/${campaignId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      }).then((r) => readJson(r));
      invalidateClientOverviewCache();
      await loadOverview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Campaign could not be reviewed");
    } finally {
      setReviewingId(null);
    }
  };

  const updateSharedCandidateStatus = async (
    id: string,
    reviewStatus: ClientSharedCandidate["reviewStatus"]
  ) => {
    setReviewingCandidateId(id);
    try {
      await fetch(`/api/client/shared-candidates/${encodeURIComponent(id)}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus }),
      }).then((r) => readJson(r));
      invalidateClientOverviewCache();
      await Promise.all([loadSharedCandidates(), loadOverview(true)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Candidate review could not be saved");
    } finally {
      setReviewingCandidateId(null);
    }
  };

  const generateSeatCode = async (seatLabel: string) => {
    setCodeBusy(seatLabel);
    setError(null);
    try {
      await fetch("/api/client/access-codes", { method: "POST" }).then((r) => readJson(r));
      invalidateClientOverviewCache();
      await loadOverview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Access code could not be generated");
    } finally {
      setCodeBusy(null);
    }
  };

  const refreshSeatCode = async (seatLabel: string, refreshCodeDocumentId: string) => {
    setCodeBusy(seatLabel);
    setError(null);
    try {
      await fetch("/api/client/access-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshCodeDocumentId }),
      }).then((r) => readJson(r));
      invalidateClientOverviewCache();
      await loadOverview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Access code could not be refreshed");
    } finally {
      setCodeBusy(null);
    }
  };

  const releaseHiringManager = async (manager: ClientHiringManagerSeat) => {
    setReleasingManagerId(manager.documentId);
    setError(null);
    try {
      await fetch(
        `/api/client/hiring-managers/${encodeURIComponent(manager.documentId)}/release`,
        { method: "POST" }
      ).then((r) => readJson(r));
      invalidateClientOverviewCache();
      await loadOverview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hiring-manager seat could not be released");
    } finally {
      setReleasingManagerId(null);
    }
  };

  const updateApprovalMode = async (checked: boolean) => {
    const nextMode = checked ? "auto_approve" : "require_approval";
    const clientDocumentId = summary?.client?.documentId;
    if (!clientDocumentId) {
      setError("Client account could not be resolved");
      return;
    }

    const previousSummary = summary;
    setApprovalModeBusy(true);
    setError(null);
    setSummary((current) =>
      current?.client
        ? { ...current, client: { ...current.client, campaignApprovalMode: nextMode } }
        : current
    );

    try {
      await fetch("/api/client/approval-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientDocumentId, mode: nextMode }),
      }).then((r) => readJson(r));
      invalidateClientOverviewCache();
    } catch (err) {
      setSummary(previousSummary);
      setError(err instanceof Error ? err.message : "Approval mode could not be updated");
    } finally {
      setApprovalModeBusy(false);
    }
  };

  return {
    summary,
    campaigns,
    accessCodes,
    hiringManagers,
    sharedCandidates,
    contract,
    loading,
    sharedLoading,
    contractLoading,
    error,
    setError,
    pendingCampaigns,
    activeHiringManagers,
    previousHiringManagers,
    pendingSharedCandidates,
    seatSlots,
    reviewingId,
    reviewingCandidateId,
    codeBusy,
    releasingManagerId,
    approvalModeBusy,
    loadOverview,
    loadSharedCandidates,
    loadContract,
    reviewCampaign,
    updateSharedCandidateStatus,
    generateSeatCode,
    refreshSeatCode,
    releaseHiringManager,
    updateApprovalMode,
  };
}
