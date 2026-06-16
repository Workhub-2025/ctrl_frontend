"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CandidateSessionService,
  type CandidatePortalApplication,
} from "@/services/candidate-session.service";
import { listenForAssessmentCompletion } from "@/lib/assessment-completion";
import {
  mapApplication,
  type CandidateApplicationView,
} from "@/lib/candidate/portal";

type RefreshOptions = {
  force?: boolean;
  /** Keep the current data on error instead of surfacing an error state. */
  preserveOnError?: boolean;
  /** Guarantee a minimum spinner duration for manual refreshes. */
  minSpinMs?: number;
};

export type UseCandidateApplicationsResult = {
  applications: CandidateApplicationView[];
  rawApplications: CandidatePortalApplication[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string;
  lastRefreshAt: number | null;
  refresh: (options?: RefreshOptions) => Promise<void>;
};

function hydrateFromCache(
  cached: CandidatePortalApplication[]
): Pick<
  UseCandidateApplicationsResult,
  "rawApplications" | "applications" | "lastRefreshAt"
> {
  return {
    rawApplications: cached,
    applications: cached.map((app, index) => mapApplication(app, index)),
    lastRefreshAt: CandidateSessionService.getMyApplicationsLastRefresh(),
  };
}

/**
 * Centralised data access for every candidate portal surface. Wraps the
 * `CandidateSessionService` fetch, exposes loading/refresh/error state, maps to
 * the shared view model, and auto-refreshes when an assessment completes in
 * another tab.
 */
export function useCandidateApplications(): UseCandidateApplicationsResult {
  const cachedOnMount = CandidateSessionService.getCachedApplications();
  const [rawApplications, setRawApplications] = useState<CandidatePortalApplication[]>(
    () => cachedOnMount ?? []
  );
  const [applications, setApplications] = useState<CandidateApplicationView[]>(() =>
    cachedOnMount ? cachedOnMount.map((app, index) => mapApplication(app, index)) : []
  );
  const [isLoading, setIsLoading] = useState(() => !CandidateSessionService.hasFreshApplicationsCache());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(
    CandidateSessionService.getMyApplicationsLastRefresh()
  );

  const refresh = useCallback(async (options?: RefreshOptions) => {
    const isManualRefresh = !!options?.force;

    if (!isManualRefresh && CandidateSessionService.hasFreshApplicationsCache()) {
      const hydrated = hydrateFromCache(CandidateSessionService.getCachedApplications() ?? []);
      setRawApplications(hydrated.rawApplications);
      setApplications(hydrated.applications);
      setLastRefreshAt(hydrated.lastRefreshAt);
      setError("");
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    const startTime = Date.now();
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");

    try {
      const portalApplications = await CandidateSessionService.getMyApplications({
        force: options?.force,
      });
      setRawApplications(portalApplications);
      setApplications(portalApplications.map((app, index) => mapApplication(app, index)));
      setLastRefreshAt(CandidateSessionService.getMyApplicationsLastRefresh());
    } catch (err) {
      console.error("[CandidateDashboard] Failed to load applications:", err);
      if (!options?.preserveOnError) {
        setError(
          err instanceof Error
            ? err.message
            : "We could not load your assessments. Please refresh or try again shortly."
        );
      }
    } finally {
      if (isManualRefresh) {
        const minSpin = options?.minSpinMs ?? 800;
        const elapsed = Date.now() - startTime;
        if (elapsed < minSpin) {
          await new Promise((resolve) => setTimeout(resolve, minSpin - elapsed));
        }
      }
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return listenForAssessmentCompletion(() => {
      CandidateSessionService.invalidateApplications();
      void refresh({ force: true, preserveOnError: true });
    });
  }, [refresh]);

  return {
    applications,
    rawApplications,
    isLoading,
    isRefreshing,
    error,
    lastRefreshAt,
    refresh,
  };
}
