import { describe, expect, it } from "vitest";
import { mapFirebaseReportToHmResult } from "@/lib/hm-assessment-progress";

describe("mapFirebaseReportToHmResult", () => {
  it("passes decrypted competency metrics into HM result", () => {
    const mapped = mapFirebaseReportToHmResult({
      attemptId: "attempt-1",
      campaignAssessmentId: "stack-1",
      assessmentSlug: "typing",
      releaseVersion: "1.0.1",
      status: "scored",
      resultId: "result-1",
      revision: 1,
      overallScore: 82,
      meetsConfiguredStandard: true,
      criticalFlagCount: 0,
      submittedAt: "2026-07-26T12:00:00.000Z",
      completedAt: "2026-07-26T12:01:00.000Z",
      competencyScores: [
        { id: "speed", label: "Speed", weight: 40, score: 80 },
        { id: "accuracy", label: "Accuracy", weight: 40, score: 85 },
        { id: "stability", label: "Stability", weight: 20, score: 78 },
      ],
      criticalFlags: [],
      scenarioEvidence: [{ wpm: 61, accuracy: 97, stabilityScore: 78 }],
      reportMetrics: {
        wpm: 61,
        accuracy: 97,
        passageEvidence: [{ wpm: 61, accuracy: 97, stabilityScore: 78 }],
        evidenceLabel: undefined,
      },
    });

    expect(mapped.numericScore).toBe(82);
    expect(mapped.wpm).toBe(61);
    expect(mapped.accuracy).toBe(97);
    expect(mapped.metrics?.competencyScores).toHaveLength(3);
    expect(mapped.metrics?.passageEvidence).toEqual([
      { wpm: 61, accuracy: 97, stabilityScore: 78 },
    ]);
  });

  it("omits scored presentation while attempt is still in progress", () => {
    const mapped = mapFirebaseReportToHmResult({
      attemptId: "attempt-2",
      campaignAssessmentId: "stack-1",
      assessmentSlug: "call-simulation",
      releaseVersion: "1.1.0",
      status: "in_progress",
      resultId: null,
      revision: null,
      overallScore: null,
      meetsConfiguredStandard: null,
      criticalFlagCount: null,
      submittedAt: null,
      completedAt: null,
    });
    expect(mapped.numericScore).toBeNull();
    expect(mapped.assessmentStatus).toBe("in-progress");
  });
});
