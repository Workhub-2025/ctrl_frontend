import { describe, expect, it } from "vitest";
import {
  areAllSessionCandidatesComplete,
  getCandidateAssessmentProgress,
} from "@/lib/hiring-manager/session-completion";

describe("getCandidateAssessmentProgress", () => {
  it("counts submitted and scoring results as finished candidate work", () => {
    const results = [
      { id: "1", assessment: "Typing", assessmentStatus: "submitted" },
      { id: "2", assessment: "Judgement", assessmentStatus: "scoring" },
      { id: "3", assessment: "Memory", assessmentStatus: "completed" },
      { id: "4", assessment: "Calls", completedAt: "2026-08-02T09:00:00.000Z" },
      { id: "5", assessment: "Prioritisation", numericScore: 82 },
    ];

    expect(getCandidateAssessmentProgress({ results }, 5)).toEqual({
      completed: 5,
      total: 5,
    });
    expect(areAllSessionCandidatesComplete([{ results }], 5)).toBe(true);
  });

  it("does not count abandoned or empty result shells", () => {
    const results = [
      { id: "1", assessment: "Typing", assessmentStatus: "abandoned" },
      { id: "2", assessment: "Judgement" },
    ];

    expect(getCandidateAssessmentProgress({ results }, 5)).toEqual({
      completed: 0,
      total: 5,
    });
  });
});
