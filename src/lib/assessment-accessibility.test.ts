import { describe, expect, it } from "vitest";
import {
  assessmentTimerAnnouncement,
  restoreAssessmentProgress,
} from "./assessment-accessibility";

describe("assessment timer announcements", () => {
  it("announces the initial duration once", () => {
    expect(assessmentTimerAnnouncement(null, 1_800)).toBe(
      "30 minutes remaining.",
    );
  });

  it("stays silent during ordinary one-second updates", () => {
    expect(assessmentTimerAnnouncement(899, 898)).toBeNull();
    expect(assessmentTimerAnnouncement(31, 30)).toBe(
      "30 seconds remaining.",
    );
  });

  it("announces only the first crossed threshold after a delayed update", () => {
    expect(assessmentTimerAnnouncement(125, 59)).toBe("2 minutes remaining.");
    expect(assessmentTimerAnnouncement(2, 0)).toBe("Time has expired.");
  });
});

describe("assessment progress restoration", () => {
  const fallback = { answers: {}, complete: false };

  it("restores a valid stage and object state", () => {
    const saved = { answers: { q1: "a" }, complete: false };
    expect(
      restoreAssessmentProgress({ stageIndex: 2, state: saved }, fallback, 5),
    ).toEqual({ stageIndex: 2, state: saved });
  });

  it.each([
    null,
    [],
    { stageIndex: -1, state: {} },
    { stageIndex: 4, state: {} },
    { stageIndex: 5, state: {} },
    { stageIndex: 1.5, state: {} },
    { stageIndex: 1, state: null },
    { stageIndex: 1, state: [] },
  ])("falls back safely for invalid progress payload %j", (progressData) => {
    expect(restoreAssessmentProgress(progressData, fallback, 5)).toEqual({
      stageIndex: 0,
      state: fallback,
    });
  });
});
