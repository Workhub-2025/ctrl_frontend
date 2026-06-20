import type { IntegrityEventType } from "@/lib/integrity-events";

interface TrackIntegrityEventOptions {
  candidateSessionDocumentId: string;
  assessmentSlug: string;
  eventType: IntegrityEventType;
  metadata?: Record<string, unknown>;
}

export class AssessmentIntegrityService {
  static async trackEvent({
    candidateSessionDocumentId,
    assessmentSlug,
    eventType,
    metadata,
  }: TrackIntegrityEventOptions): Promise<boolean> {
    if (!candidateSessionDocumentId?.trim()) {
      console.warn("[AssessmentIntegrityService] Missing candidateSessionDocumentId");
      return false;
    }

    try {
      const response = await fetch("/api/assessment/attempt/integrity-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidateSessionDocumentId,
          assessmentSlug,
          eventType,
          metadata,
          occurredAt: new Date().toISOString(),
        }),
        keepalive: true,
      });

      return response.ok;
    } catch (error) {
      console.error("[AssessmentIntegrityService] trackEvent failed:", error);
      return false;
    }
  }
}

export type { IntegrityEventType };
