import { describe, expect, it } from "vitest";

import {
  getAssessmentLibraryPreview,
  ASSESSMENT_LIBRARY_PREVIEWS,
} from "@/lib/assessment-library-previews";

describe("assessment library previews", () => {
  it("provides HM-safe snippets for every platform slug", () => {
    expect(Object.keys(ASSESSMENT_LIBRARY_PREVIEWS).sort()).toEqual([
      "call-simulation",
      "prioritisation",
      "short-term-memory",
      "situational-judgement",
      "typing",
    ]);
    for (const preview of Object.values(ASSESSMENT_LIBRARY_PREVIEWS)) {
      expect(preview.overview.length).toBeGreaterThan(20);
      expect(preview.samples.length).toBeGreaterThan(0);
    }
  });

  it("returns two SJT and two PJA sample snippets", () => {
    expect(getAssessmentLibraryPreview("situational-judgement")?.samples).toHaveLength(2);
    expect(getAssessmentLibraryPreview("prioritisation")?.samples).toHaveLength(2);
  });

  it("wires call-sim audio preview to the public assessment-previews asset", () => {
    const preview = getAssessmentLibraryPreview("call-simulation", "1.1.0");
    expect(preview?.overview).toMatch(/Practice call plus two assessed/);
    expect(preview?.audioPreview?.src).toBe(
      "/assets/assessment-previews/call-sim-call-1-10s.mp3",
    );
    expect(preview?.audioPreview?.durationSeconds).toBe(10);
  });
});
