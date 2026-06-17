"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AssessmentAttemptService, type CandidateAssessmentAttempt } from "@/services/assessment-attempt.service";

const HEARTBEAT_INTERVAL_MS = 15_000;
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

  useEffect(() => {
    getSnapshotRef.current = getSnapshot;
  }, [getSnapshot]);

  useEffect(() => {
    onRecoveredRef.current = onRecovered;
  }, [onRecovered]);

  const abandonAttempt = useCallback(async () => {
    if (!candidateSessionDocumentId) return;
    try {
      await AssessmentAttemptService.abandon({
        candidateSessionDocumentId,
        assessmentSlug,
        snapshot: getSnapshotRef.current(),
        reason: "heartbeat_timeout",
      });
    } catch {
      // Best effort — beacon may have already fired.
    }
    setIsLocked(true);
    setIsReconnecting(false);
    setReconnectSecondsLeft(null);
  }, [assessmentSlug, candidateSessionDocumentId]);

  const sendHeartbeat = useCallback(
    async (start = false) => {
      if (!candidateSessionDocumentId || heartbeatInFlightRef.current) return false;

      heartbeatInFlightRef.current = true;
      try {
        await AssessmentAttemptService.heartbeat({
          candidateSessionDocumentId,
          assessmentSlug,
          contentVersion: contentVersion ?? null,
          snapshot: getSnapshotRef.current(),
          start,
        });
        reconnectStartedAtRef.current = null;
        setIsReconnecting(false);
        setReconnectSecondsLeft(null);
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
    [assessmentSlug, candidateSessionDocumentId, contentVersion]
  );

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
    if (!isActive || isLocked || !candidateSessionDocumentId) return;

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
  ]);

  useEffect(() => {
    if (!isActive || isLocked || !candidateSessionDocumentId) return;

    const handleOffline = () => {
      if (!reconnectStartedAtRef.current) {
        reconnectStartedAtRef.current = Date.now();
      }
      setIsReconnecting(true);
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
  }, [candidateSessionDocumentId, isActive, isLocked, sendHeartbeat]);

  useEffect(() => {
    if (!isReconnecting || isLocked) return;

    const tick = () => {
      const startedAt = reconnectStartedAtRef.current;
      if (!startedAt) return;

      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.ceil((RECONNECT_TIMEOUT_MS - elapsed) / 1000));
      setReconnectSecondsLeft(remaining);

      if (elapsed >= RECONNECT_TIMEOUT_MS) {
        void abandonAttempt();
        return;
      }

      void sendHeartbeat(false);
    };

    tick();
    const intervalId = window.setInterval(tick, RECONNECT_POLL_MS);
    return () => window.clearInterval(intervalId);
  }, [abandonAttempt, isLocked, isReconnecting, sendHeartbeat]);

  useEffect(() => {
    if (!isActive || isLocked || !candidateSessionDocumentId) return;

    const handlePageHide = () => {
      const payload = JSON.stringify({
        candidateSessionDocumentId,
        assessmentSlug,
        snapshot: getSnapshotRef.current(),
        reason: "page_hidden",
      });
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/assessment/attempt/abandon", blob);
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [assessmentSlug, candidateSessionDocumentId, isActive, isLocked]);

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
