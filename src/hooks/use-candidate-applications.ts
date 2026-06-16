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

/**
 * Centralised data access for every candidate portal surface. Wraps the
 * `CandidateSessionService` fetch, exposes loading/refresh/error state, maps to
 * the shared view model, and auto-refreshes when an assessment completes in
 * another tab.
 */
export function useCandidateApplications(): UseCandidateApplicationsResult {
  const [rawApplications, setRawApplications] = useState<
    CandidatePortalApplication[]
  >([]);
  const [applications, setApplications] = useState<CandidateApplicationView[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(
    CandidateSessionService.getMyApplicationsLastRefresh()
  );

  const refresh = useCallback(async (options?: RefreshOptions) => {
    const isManualRefresh = !!options?.force;
    const startTime = Date.now();
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");

    try {
      const portalApplications = await CandidateSessionService.getMyApplications(
        { force: options?.force }
      );
      setRawApplications(portalApplications);
      setApplications(portalApplications.map((app, i) => mapApplication(app, i)));
      setLastRefreshAt(CandidateSessionService.getMyApplicationsLastRefresh());
    } catch (err) {
      console.error("[CandidateDashboard] Failed to load applications:", err);
      if (!options?.preserveOnError) {
        setError(
          "We could not load your assessments. Please refresh or try again shortly."
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
