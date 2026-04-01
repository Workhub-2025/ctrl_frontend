import type { IntegrityEventType } from "@/app/api/assessment/integrity-events/route";

interface TrackIntegrityEventOptions {
  assessmentType: string;
  eventType: IntegrityEventType;
  metadata?: Record<string, unknown>;
}

export class AssessmentIntegrityService {
  static async trackEvent({
    assessmentType,
    eventType,
    metadata,
  }: TrackIntegrityEventOptions): Promise<boolean> {
    try {
      const response = await fetch("/api/assessment/integrity-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assessmentType,
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

