"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ClientAccessCode,
  ClientCampaignApprovalItem,
  ClientContract,
  ClientDashboardSummary,
  ClientHiringManagerSeat,
  ClientSharedCandidate,
} from "@/services/client-portal.service";
import type {
  ClientUpgradeRequestPayload,
  ClientUpgradeRequestRecord,
} from "@/lib/client/entitlements";
import type { BackendClientEntitlements } from "@/services/client-upgrade.service";
import {
  fetchPortalJson,
  invalidatePortalCache,
  PORTAL_CACHE_TTL_MS,
} from "@/lib/portal-fetch-cache";

export type SeatSlot =
  | { type: "occupied"; label: string; manager: ClientHiringManagerSeat }
  | { type: "empty"; label: string; accessCode?: ClientAccessCode };

export type ClientEntitlements = BackendClientEntitlements;

type ClientPortalContextValue = {
  summary: ClientDashboardSummary | null;
  campaigns: ClientCampaignApprovalItem[];
  accessCodes: ClientAccessCode[];
  hiringManagers: ClientHiringManagerSeat[];
  sharedCandidates: ClientSharedCandidate[];
  contract: ClientContract | null;
  entitlements: ClientEntitlements | null;
  upgradeRequests: ClientUpgradeRequestRecord[];
  loading: boolean;
  sharedLoading: boolean;
  entitlementsLoading: boolean;
  upgradeRequestsLoading: boolean;
  reviewingId: string | null;
  reviewingCandidateId: string | null;
  codeBusy: string | null;
  inviteBusy: string | null;
  releasingManagerId: string | null;
  approvalModeBusy: boolean;
  submittingUpgrade: boolean;
  error: string | null;
  setError: (message: string | null) => void;
  pendingCampaigns: ClientCampaignApprovalItem[];
  activeHiringManagers: ClientHiringManagerSeat[];
  previousHiringManagers: ClientHiringManagerSeat[];
  pendingSharedCandidates: ClientSharedCandidate[];
  seatSlots: SeatSlot[];
  loadOverview: (force?: boolean) => Promise<void>;
  loadSharedCandidates: (reviewStatus?: string, force?: boolean) => Promise<void>;
  loadEntitlements: (force?: boolean) => Promise<void>;
  loadUpgradeRequests: (force?: boolean) => Promise<void>;
  markUpgradeRequestPaid: (billingRequestDocumentId: string) => void;
  submitUpgradeRequest: (input: {
    payload: ClientUpgradeRequestPayload;
    priority?: "low" | "normal" | "high" | "urgent";
  }) => Promise<ClientUpgradeRequestRecord>;
  reviewCampaign: (campaignId: string, decision: "approved" | "rejected") => Promise<void>;
  updateSharedCandidateStatus: (
    id: string,
    reviewStatus: ClientSharedCandidate["reviewStatus"]
  ) => Promise<void>;
  generateSeatCode: (seatLabel: string) => Promise<void>;
  refreshSeatCode: (seatLabel: string, refreshCodeDocumentId: string) => Promise<void>;
  sendSeatInvite: (seatLabel: string, email: string, accessCodeDocumentId?: string) => Promise<void>;
  releaseHiringManager: (manager: ClientHiringManagerSeat) => Promise<void>;
  updateApprovalMode: (checked: boolean) => Promise<void>;
};

export type ClientOverviewData = {
  summary: ClientDashboardSummary | null;
  campaigns: ClientCampaignApprovalItem[];
  accessCodes: ClientAccessCode[];
  hiringManagers: ClientHiringManagerSeat[];
};

const EMPTY_OVERVIEW: ClientOverviewData = {
  summary: null,
  campaigns: [],
  accessCodes: [],
  hiringManagers: [],
};

export function invalidateClientOverviewCache() {
  invalidatePortalCache("client:overview");
}

function applyOverview(state: ClientOverviewData) {
  return {
    summary: state.summary,
    campaigns: state.campaigns,
    accessCodes: state.accessCodes,
    hiringManagers: state.hiringManagers,
    contract: state.summary?.activeContract ?? null,
  };
}

async function fetchOverviewCached(force = false) {
  return fetchPortalJson<ClientOverviewData>({
    key: "client:overview",
    url: "/api/client/overview",
    fallback: EMPTY_OVERVIEW,
    force,
    allowEmpty: true,
    transform: (body) => {
      const record = body as { data?: ClientOverviewData };
      return record.data ?? EMPTY_OVERVIEW;
    },
  });
}

export function useClientPortalState(): ClientPortalContextValue {
  const [summary, setSummary] = useState<ClientDashboardSummary | null>(null);
  const [campaigns, setCampaigns] = useState<ClientCampaignApprovalItem[]>([]);
  const [accessCodes, setAccessCodes] = useState<ClientAccessCode[]>([]);
  const [hiringManagers, setHiringManagers] = useState<ClientHiringManagerSeat[]>([]);
  const [sharedCandidates, setSharedCandidates] = useState<ClientSharedCandidate[]>([]);
  const [contract, setContract] = useState<ClientContract | null>(null);
  const [entitlements, setEntitlements] = useState<ClientEntitlements | null>(null);
  const [upgradeRequests, setUpgradeRequests] = useState<ClientUpgradeRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [entitlementsLoading, setEntitlementsLoading] = useState(false);
  const [upgradeRequestsLoading, setUpgradeRequestsLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewingCandidateId, setReviewingCandidateId] = useState<string | null>(null);
  const [codeBusy, setCodeBusy] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState<string | null>(null);
  const [releasingManagerId, setReleasingManagerId] = useState<string | null>(null);
  const [approvalModeBusy, setApprovalModeBusy] = useState(false);
  const [submittingUpgrade, setSubmittingUpgrade] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entitlementsLoadIdRef = useRef(0);
  const upgradeRequestsLoadIdRef = useRef(0);

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
    try {
      const overview = await fetchOverviewCached(force);
      const next = applyOverview(overview);
      setSummary(next.summary);
      setCampaigns(next.campaigns);
      setAccessCodes(next.accessCodes);
      setHiringManagers(next.hiringManagers);
      setContract(next.contract);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Client dashboard could not be loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSharedCandidates = useCallback(async (reviewStatus?: string, force = false) => {
    setSharedLoading(true);
    const cacheKey = `client:shared:${reviewStatus ?? "all"}`;
    const query = reviewStatus ? `?reviewStatus=${encodeURIComponent(reviewStatus)}` : "";

    try {
      const data = await fetchPortalJson<ClientSharedCandidate[]>({
        key: cacheKey,
        url: `/api/client/shared-candidates${query}`,
        fallback: [],
        force,
        allowEmpty: true,
      });
      setSharedCandidates(data);
    } catch {
      // Keep existing list — shared candidates are secondary data.
    } finally {
      setSharedLoading(false);
    }
  }, []);

  const loadEntitlements = useCallback(async (force = false) => {
    if (force) invalidatePortalCache("client:entitlements");
    const loadId = ++entitlementsLoadIdRef.current;
    setEntitlementsLoading(true);
    try {
      const data = await fetchPortalJson<ClientEntitlements | null>({
        key: "client:entitlements",
        url: "/api/client/entitlements",
        fallback: null,
        force,
        allowEmpty: true,
      });
      if (loadId !== entitlementsLoadIdRef.current) return;
      setEntitlements(data);
      if (data?.contract) setContract(data.contract);
    } catch {
      // Entitlements are optional on some pages — avoid global error banners.
    } finally {
      if (loadId === entitlementsLoadIdRef.current) {
        setEntitlementsLoading(false);
      }
    }
  }, []);

  const loadUpgradeRequests = useCallback(async (force = false) => {
    if (force) invalidatePortalCache("client:upgrade-requests");
    const loadId = ++upgradeRequestsLoadIdRef.current;
    setUpgradeRequestsLoading(true);
    try {
      const data = await fetchPortalJson<ClientUpgradeRequestRecord[]>({
        key: "client:upgrade-requests",
        url: "/api/client/upgrade-requests",
        fallback: [],
        force,
        allowEmpty: true,
      });
      if (loadId !== upgradeRequestsLoadIdRef.current) return;
      setUpgradeRequests(data);
    } catch {
      // Billing list failures should not block the rest of the portal.
    } finally {
      if (loadId === upgradeRequestsLoadIdRef.current) {
        setUpgradeRequestsLoading(false);
      }
    }
  }, []);

  const markUpgradeRequestPaid = useCallback((billingRequestDocumentId: string) => {
    setUpgradeRequests((current) =>
      current.map((request) =>
        request.id === billingRequestDocumentId
          ? { ...request, billingStatus: "paid", status: "paid" }
          : request
      )
    );
  }, []);

  useEffect(() => {
    void loadOverview(false);
    void loadEntitlements(false);
    void loadUpgradeRequests(false);
  }, [loadEntitlements, loadOverview, loadUpgradeRequests]);

  const reviewCampaign = async (campaignId: string, decision: "approved" | "rejected") => {
    setReviewingId(campaignId);
    try {
      const response = await fetch(`/api/client/campaign-approvals/${campaignId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Campaign could not be reviewed");
      }
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
      const response = await fetch(`/api/client/shared-candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Review status could not be updated");
      }
      invalidatePortalCache("client:shared:all");
      await Promise.all([loadSharedCandidates(undefined, true), loadOverview(true)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review status could not be updated");
    } finally {
      setReviewingCandidateId(null);
    }
  };

  const generateSeatCode = async (seatLabel: string) => {
    setCodeBusy(seatLabel);
    try {
      const response = await fetch("/api/client/access-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatLabel }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Access code could not be generated");
      }
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
    try {
      const response = await fetch(`/api/client/access-codes/${refreshCodeDocumentId}/refresh`, {
        method: "POST",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Access code could not be refreshed");
      }
      invalidateClientOverviewCache();
      await loadOverview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Access code could not be refreshed");
    } finally {
      setCodeBusy(null);
    }
  };

  const sendSeatInvite = async (
    seatLabel: string,
    email: string,
    accessCodeDocumentId?: string
  ) => {
    setInviteBusy(seatLabel);
    try {
      const response = await fetch("/api/client/hiring-managers/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, accessCodeDocumentId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Invite could not be sent");
      }
      invalidateClientOverviewCache();
      await loadOverview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite could not be sent");
      throw err;
    } finally {
      setInviteBusy(null);
    }
  };

  const releaseHiringManager = async (manager: ClientHiringManagerSeat) => {
    setReleasingManagerId(manager.documentId);
    try {
      const response = await fetch(`/api/client/hiring-managers/${manager.documentId}/release`, {
        method: "POST",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Hiring manager could not be released");
      }
      invalidateClientOverviewCache();
      await loadOverview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hiring manager could not be released");
    } finally {
      setReleasingManagerId(null);
    }
  };

  const updateApprovalMode = async (checked: boolean) => {
    setApprovalModeBusy(true);
    try {
      const response = await fetch("/api/client/approval-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requireApproval: checked }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Approval mode could not be updated");
      }
      invalidateClientOverviewCache();
      await loadOverview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval mode could not be updated");
    } finally {
      setApprovalModeBusy(false);
    }
  };

  const submitUpgradeRequest = async (input: {
    payload: ClientUpgradeRequestPayload;
    priority?: "low" | "normal" | "high" | "urgent";
  }) => {
    setSubmittingUpgrade(true);
    try {
      const response = await fetch("/api/client/upgrade-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((body as { error?: string }).error || "Upgrade request could not be submitted");
      }
      invalidatePortalCache("client:upgrade-requests");
      await loadUpgradeRequests(true);
      return (body as { data: ClientUpgradeRequestRecord }).data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upgrade request could not be submitted");
      throw err;
    } finally {
      setSubmittingUpgrade(false);
    }
  };

  return {
    summary,
    campaigns,
    accessCodes,
    hiringManagers,
    sharedCandidates,
    contract,
    entitlements,
    upgradeRequests,
    loading,
    sharedLoading,
    entitlementsLoading,
    upgradeRequestsLoading,
    reviewingId,
    reviewingCandidateId,
    codeBusy,
    inviteBusy,
    releasingManagerId,
    approvalModeBusy,
    submittingUpgrade,
    error,
    setError,
    pendingCampaigns,
    activeHiringManagers,
    previousHiringManagers,
    pendingSharedCandidates,
    seatSlots,
    loadOverview,
    loadSharedCandidates,
    loadEntitlements,
    loadUpgradeRequests,
    markUpgradeRequestPaid,
    submitUpgradeRequest,
    reviewCampaign,
    updateSharedCandidateStatus,
    generateSeatCode,
    refreshSeatCode,
    sendSeatInvite,
    releaseHiringManager,
    updateApprovalMode,
  };
}
