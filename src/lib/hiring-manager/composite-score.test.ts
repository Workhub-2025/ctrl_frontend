import { describe, expect, it } from "vitest";
import { computeWeightedCompositeScore } from "@/lib/hiring-manager/composite-score";

describe("computeWeightedCompositeScore", () => {
  const stack = [
    { displayName: "Typing", slug: "typing", weight: 40 },
    { displayName: "Situational judgement", slug: "situational-judgement", weight: 30 },
    { displayName: "Call simulation", slug: "call-simulation", weight: 30 },
  ];

  it("sums weighted contributions without renormalizing incomplete stacks", () => {
    const score = computeWeightedCompositeScore(stack, [
      { assessment: "Typing", numericScore: 80, assessmentStatus: "completed" },
      { assessment: "Situational judgement", numericScore: 60, assessmentStatus: "completed" },
    ]);

    expect(score).toBe(50);
  });

  it("returns null when no scored assessments exist", () => {
    const score = computeWeightedCompositeScore(stack, []);
    expect(score).toBeNull();
  });

  it("ignores abandoned assessments", () => {
    const score = computeWeightedCompositeScore(stack, [
      { assessment: "Typing", numericScore: 80, assessmentStatus: "abandoned" },
      { assessment: "Situational judgement", numericScore: 60, assessmentStatus: "completed" },
    ]);

    expect(score).toBe(18);
  });
});
