"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchPortalJson,
  getPortalCacheUpdatedAt,
  invalidatePortalCache,
  PORTAL_CACHE_TTL_MS,
} from "@/lib/portal-fetch-cache";
import { syncHiringManagerOverviewCache } from "@/services/hiring-manager-portal-client.service";
import type {
  HiringManagerCampaignDetail,
  HiringManagerCampaignListItem,
  HiringManagerSessionListItem,
} from "@/services/hiring-manager-portal-client.service";

export type HiringManagerOverviewData = {
  campaigns: HiringManagerCampaignListItem[];
  campaignDetails: HiringManagerCampaignDetail[];
  sessions: HiringManagerSessionListItem[];
};

const EMPTY_OVERVIEW: HiringManagerOverviewData = {
  campaigns: [],
  campaignDetails: [],
  sessions: [],
};

export const HM_OVERVIEW_CACHE_KEY = "hm:overview";

export function invalidateHiringManagerOverviewCache() {
  invalidatePortalCache(HM_OVERVIEW_CACHE_KEY);
}

async function fetchOverviewCached(force = false) {
  return fetchPortalJson<HiringManagerOverviewData>({
    key: HM_OVERVIEW_CACHE_KEY,
    url: "/api/hiring-manager/overview",
    fallback: EMPTY_OVERVIEW,
    force,
    allowEmpty: true,
    transform: (body) => {
      const record = body as { data?: HiringManagerOverviewData };
      return record.data ?? EMPTY_OVERVIEW;
    },
  });
}

export function useHiringManagerPortal() {
  const [overview, setOverview] = useState<HiringManagerOverviewData>(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);

  const loadOverview = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOverviewCached(force);
      syncHiringManagerOverviewCache(data);
      setOverview(data);
      setLastRefreshAt(getPortalCacheUpdatedAt(HM_OVERVIEW_CACHE_KEY));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Overview could not be loaded"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  return {
    campaigns: overview.campaigns,
    campaignDetails: overview.campaignDetails,
    sessions: overview.sessions,
    loading,
    error,
    lastRefreshAt,
    loadOverview,
    cacheTtlMs: PORTAL_CACHE_TTL_MS,
  };
}
