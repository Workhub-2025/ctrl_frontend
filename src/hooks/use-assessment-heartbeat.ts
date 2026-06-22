"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AssessmentAttemptService, type CandidateAssessmentAttempt } from "@/services/assessment-attempt.service";

const HEARTBEAT_INTERVAL_MS = 5_000;
const RECONNECT_TIMEOUT_MS = 60_000;
const RECONNECT_POLL_MS = 3_000;
const LOCKED_STATUS_POLL_MS = 15_000;

export type UseAssessmentHeartbeatOptions = {
  assessmentSlug: string;
  candidateSessionDocumentId?: string | null;
  contentVersion?: string | null;
  isActive: boolean;
  getSnapshot: () => Record<string, unknown> | null;
  onStart?: () => void;
  onRecovered?: (attempt: CandidateAssessmentAttempt) => void;
};

export function useAssessmentHeartbeat({
  assessmentSlug,
  candidateSessionDocumentId,
  contentVersion,
  isActive,
  getSnapshot,
  onStart,
  onRecovered,
}: UseAssessmentHeartbeatOptions) {
  const [isLocked, setIsLocked] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectSecondsLeft, setReconnectSecondsLeft] = useState<number | null>(null);
  const [statusChecked, setStatusChecked] = useState(false);

  const startedRef = useRef(false);
  const reconnectStartedAtRef = useRef<number | null>(null);
  const getSnapshotRef = useRef(getSnapshot);
  const heartbeatInFlightRef = useRef(false);
  const onRecoveredRef = useRef(onRecovered);
  const abandoningRef = useRef(false);

  useEffect(() => {
    getSnapshotRef.current = getSnapshot;
  }, [getSnapshot]);

  useEffect(() => {
    onRecoveredRef.current = onRecovered;
  }, [onRecovered]);

  const getSnapshotWithContext = useCallback(() => {
    const snapshot = getSnapshotRef.current() ?? {};
    const path =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : null;

    return {
      ...snapshot,
      recoveryContext: {
        path,
        capturedAt: new Date().toISOString(),
        online:
          typeof navigator !== "undefined" && "onLine" in navigator
            ? navigator.onLine
            : null,
      },
    };
  }, []);

  const abandonAttempt = useCallback(async (reason = "heartbeat_timeout") => {
    if (!candidateSessionDocumentId) return;
    if (abandoningRef.current) return;
    abandoningRef.current = true;

    try {
      await AssessmentAttemptService.abandon({
        candidateSessionDocumentId,
        assessmentSlug,
        snapshot: getSnapshotWithContext(),
        reason,
      });
    } catch {
      try {
        window.localStorage.setItem(
          `ctrl_pending_abandon:${candidateSessionDocumentId}:${assessmentSlug}`,
          JSON.stringify({
            candidateSessionDocumentId,
            assessmentSlug,
            snapshot: getSnapshotWithContext(),
            reason,
            queuedAt: new Date().toISOString(),
          })
        );
      } catch {
        // Best effort — stale heartbeat detection will still catch the server-side state.
      }
    }
    setIsLocked(true);
    setIsReconnecting(false);
    setReconnectSecondsLeft(null);
  }, [assessmentSlug, candidateSessionDocumentId, getSnapshotWithContext]);

  const sendHeartbeat = useCallback(
    async (start = false) => {
      if (!candidateSessionDocumentId || heartbeatInFlightRef.current) return false;

      heartbeatInFlightRef.current = true;
      try {
        await AssessmentAttemptService.heartbeat({
          candidateSessionDocumentId,
          assessmentSlug,
          contentVersion: contentVersion ?? null,
          snapshot: getSnapshotWithContext(),
          start,
        });
        abandoningRef.current = false;
        reconnectStartedAtRef.current = null;
        setIsReconnecting(false);
        setReconnectSecondsLeft(null);
        try {
          window.localStorage.removeItem(`ctrl_pending_abandon:${candidateSessionDocumentId}:${assessmentSlug}`);
        } catch {
          // Ignore storage errors.
        }
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.toLowerCase().includes("paused")) {
          setIsLocked(true);
          setIsReconnecting(false);
          return false;
        }
        if (!reconnectStartedAtRef.current) {
          reconnectStartedAtRef.current = Date.now();
        }
        setIsReconnecting(true);
        return false;
      } finally {
        heartbeatInFlightRef.current = false;
      }
    },
    [assessmentSlug, candidateSessionDocumentId, contentVersion, getSnapshotWithContext]
  );

  const enterReconnectMode = useCallback(() => {
    if (!reconnectStartedAtRef.current) {
      reconnectStartedAtRef.current = Date.now();
    }
    setIsReconnecting(true);
    setReconnectSecondsLeft(Math.ceil(RECONNECT_TIMEOUT_MS / 1000));
  }, []);

  useEffect(() => {
    if (!candidateSessionDocumentId) {
      setStatusChecked(true);
      return;
    }

    let cancelled = false;
    void AssessmentAttemptService.getStatus(candidateSessionDocumentId, assessmentSlug)
      .then((attempt) => {
        if (cancelled) return;
        if (attempt?.attemptStatus === "abandoned_locked") {
          setIsLocked(true);
        }
      })
      .finally(() => {
        if (!cancelled) setStatusChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [assessmentSlug, candidateSessionDocumentId]);

  useEffect(() => {
    if (!isLocked || !candidateSessionDocumentId) return;

    const pollStatus = () => {
      void AssessmentAttemptService.getStatus(candidateSessionDocumentId, assessmentSlug)
        .then((attempt) => {
          if (attempt?.attemptStatus === "in_progress") {
            setIsLocked(false);
            setIsReconnecting(false);
            setReconnectSecondsLeft(null);
            onRecoveredRef.current?.(attempt);
          }
        })
        .catch(() => {
          // Ignore transient polling failures.
        });
    };

    pollStatus();
    const intervalId = window.setInterval(pollStatus, LOCKED_STATUS_POLL_MS);
    return () => window.clearInterval(intervalId);
  }, [assessmentSlug, candidateSessionDocumentId, isLocked]);

  useEffect(() => {
    if (!isActive || isLocked || !candidateSessionDocumentId) {
      if (!isActive) {
        startedRef.current = false;
      }
      return;
    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      enterReconnectMode();
    }

    if (!startedRef.current) {
      startedRef.current = true;
      onStart?.();
      void sendHeartbeat(true);
    }

    const intervalId = window.setInterval(() => {
      if (!reconnectStartedAtRef.current) {
        void sendHeartbeat(false);
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    candidateSessionDocumentId,
    isActive,
    isLocked,
    isReconnecting,
    onStart,
    sendHeartbeat,
    enterReconnectMode,
  ]);

  useEffect(() => {
    if (!isActive || isLocked || !candidateSessionDocumentId) return;

    const handleOffline = () => {
      enterReconnectMode();
    };

    const handleOnline = () => {
      void sendHeartbeat(false);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [candidateSessionDocumentId, enterReconnectMode, isActive, isLocked, sendHeartbeat]);

  useEffect(() => {
    if (!isReconnecting || isLocked) return;

    const tick = () => {
      const startedAt = reconnectStartedAtRef.current;
      if (!startedAt) return;

      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.ceil((RECONNECT_TIMEOUT_MS - elapsed) / 1000));
      setReconnectSecondsLeft(remaining);

      if (elapsed >= RECONNECT_TIMEOUT_MS) {
        void abandonAttempt("connection_lost");
        return;
      }

      void sendHeartbeat(false);
    };

    tick();
    const intervalId = window.setInterval(tick, RECONNECT_POLL_MS);
    return () => window.clearInterval(intervalId);
  }, [abandonAttempt, isLocked, isReconnecting, sendHeartbeat]);

  useEffect(() => {
    if (!candidateSessionDocumentId) return;

    const storageKey = `ctrl_pending_abandon:${candidateSessionDocumentId}:${assessmentSlug}`;
    const flushPendingAbandon = () => {
      let queued: {
        candidateSessionDocumentId?: string;
        assessmentSlug?: string;
        snapshot?: Record<string, unknown> | null;
        reason?: string;
      } | null = null;

      try {
        const raw = window.localStorage.getItem(storageKey);
        queued = raw ? JSON.parse(raw) : null;
      } catch {
        queued = null;
      }

      if (!queued?.candidateSessionDocumentId || !queued.assessmentSlug) return;

      void AssessmentAttemptService.abandon({
        candidateSessionDocumentId: queued.candidateSessionDocumentId,
        assessmentSlug: queued.assessmentSlug,
        snapshot: queued.snapshot ?? null,
        reason: queued.reason ?? "connection_lost",
      })
        .then(() => {
          window.localStorage.removeItem(storageKey);
        })
        .catch(() => {
          // Keep queued until the next online event / page load.
        });
    };

    flushPendingAbandon();
    window.addEventListener("online", flushPendingAbandon);
    return () => window.removeEventListener("online", flushPendingAbandon);
  }, [assessmentSlug, candidateSessionDocumentId]);

  useEffect(() => {
    if (!isActive || isLocked || !candidateSessionDocumentId) return;

    const handlePageHide = () => {
      const payload = JSON.stringify({
        candidateSessionDocumentId,
        assessmentSlug,
        snapshot: getSnapshotWithContext(),
        reason: "window_closed",
      });
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/assessment/attempt/abandon", blob);
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [assessmentSlug, candidateSessionDocumentId, getSnapshotWithContext, isActive, isLocked]);

  const markCompleted = useCallback(async () => {
    if (!candidateSessionDocumentId) return;
    try {
      await AssessmentAttemptService.complete({
        candidateSessionDocumentId,
        assessmentSlug,
      });
    } catch {
      // Non-blocking after successful submit.
    }
  }, [assessmentSlug, candidateSessionDocumentId]);

  return {
    statusChecked,
    isLocked,
    isReconnecting,
    isPaused: isReconnecting || isLocked,
    reconnectSecondsLeft,
    markCompleted,
  };
}
