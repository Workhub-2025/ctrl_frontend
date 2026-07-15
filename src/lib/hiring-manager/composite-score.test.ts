import { describe, expect, it } from "vitest";
import {
  computeDecisionReadyCompositeScore,
  computeWeightedCompositeScore,
} from "@/lib/hiring-manager/composite-score";

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

describe("computeDecisionReadyCompositeScore", () => {
  const stack = [
    { displayName: "Typing", slug: "typing", weight: 40 },
    { displayName: "Situational judgement", slug: "situational-judgement", weight: 30 },
    { displayName: "Call simulation", slug: "call-simulation", weight: 30 },
  ];

  it("withholds a composite while the required stack is incomplete", () => {
    expect(
      computeDecisionReadyCompositeScore(stack, [
        { assessment: "Typing", numericScore: 80, assessmentStatus: "completed" },
      ])
    ).toBeNull();
  });

  it("returns the composite when every required assessment is scored", () => {
    expect(
      computeDecisionReadyCompositeScore(stack, [
        { assessment: "Typing", numericScore: 80, assessmentStatus: "completed" },
        {
          assessment: "Situational judgement",
          numericScore: 60,
          assessmentStatus: "completed",
        },
        {
          assessment: "Call simulation",
          numericScore: 80,
          assessmentStatus: "completed",
        },
      ])
    ).toBe(74);
  });

  it("withholds the composite when a required assessment was abandoned", () => {
    expect(
      computeDecisionReadyCompositeScore(stack, [
        { assessment: "Typing", numericScore: 80, assessmentStatus: "completed" },
        {
          assessment: "Situational judgement",
          numericScore: 60,
          assessmentStatus: "abandoned",
        },
        {
          assessment: "Call simulation",
          numericScore: 80,
          assessmentStatus: "completed",
        },
      ])
    ).toBeNull();
  });
});
