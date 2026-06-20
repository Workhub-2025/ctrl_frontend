"use client";

import { useCallback, useEffect, useRef } from "react";
import { AssessmentIntegrityService } from "@/services/assessment-integrity.service";
import type { IntegrityEventType } from "@/lib/integrity-events";

interface UseAssessmentIntegrityOptions {
  assessmentSlug: string;
  candidateSessionDocumentId?: string | null;
  enabled?: boolean;
  heartbeatMs?: number;
  metadataProvider?: () => Record<string, unknown>;
}

export function useAssessmentIntegrity({
  assessmentSlug,
  candidateSessionDocumentId,
  enabled = true,
  heartbeatMs = 30000,
  metadataProvider,
}: UseAssessmentIntegrityOptions) {
  const metadataProviderRef = useRef<(() => Record<string, unknown>) | undefined>(
    metadataProvider
  );

  useEffect(() => {
    metadataProviderRef.current = metadataProvider;
  }, [metadataProvider]);

  const emit = useCallback(
    (eventType: IntegrityEventType) => {
      if (!enabled || !candidateSessionDocumentId) return;

      const metadata = metadataProviderRef.current?.() ?? {};
      void AssessmentIntegrityService.trackEvent({
        candidateSessionDocumentId,
        assessmentSlug,
        eventType,
        metadata,
      });
    },
    [assessmentSlug, candidateSessionDocumentId, enabled]
  );

  useEffect(() => {
    if (!enabled || !candidateSessionDocumentId) return;

    emit("assessment_started");

    const onBlur = () => emit("window_blur");
    const onFocus = () => emit("window_focus");
    const onVisibilityChange = () => {
      if (document.hidden) {
        emit("tab_hidden");
      } else {
        emit("tab_visible");
      }
    };
    const onCopy = () => emit("copy_attempt");
    const onPaste = () => emit("paste_attempt");
    const onContextMenu = () => emit("context_menu_attempt");

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);

    const heartbeat = window.setInterval(() => {
      emit("heartbeat");
    }, heartbeatMs);

    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      window.clearInterval(heartbeat);
      emit("assessment_completed");
    };
  }, [candidateSessionDocumentId, emit, enabled, heartbeatMs]);
}
