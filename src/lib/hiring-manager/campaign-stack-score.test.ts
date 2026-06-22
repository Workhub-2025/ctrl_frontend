import { describe, expect, it } from "vitest";
import {
  buildCompositeStackEntries,
  getCampaignWeights,
  normalizeResolvedStackSummary,
} from "@/lib/hiring-manager/campaign-stack-score";
import { computeWeightedCompositeScore } from "@/lib/hiring-manager/composite-score";

describe("buildCompositeStackEntries", () => {
  const assessmentStack = ["Typing", "Situational judgement", "Call simulation"];

  it("prefers resolvedStackSummary weights over equal split", () => {
    const entries = buildCompositeStackEntries({
      assessmentStack,
      resolvedStackSummary: normalizeResolvedStackSummary({
        assessments: [
          { displayName: "Typing", slug: "typing", weight: 40 },
          { displayName: "Situational judgement", slug: "situational-judgement", weight: 30 },
          { displayName: "Call simulation", slug: "call-simulation", weight: 30 },
        ],
        weightsTotal: 100,
      }),
    });

    expect(entries).toEqual([
      { displayName: "Typing", slug: "typing", weight: 40 },
      { displayName: "Situational judgement", slug: "situational-judgement", weight: 30 },
      { displayName: "Call simulation", slug: "call-simulation", weight: 30 },
    ]);
  });

  it("uses campaign assessmentSettings weights when summary is absent", () => {
    const entries = buildCompositeStackEntries({
      assessmentStack,
      assessmentSettings: {
        weights: {
          Typing: 50,
          "Situational judgement": 25,
          "Call simulation": 25,
        },
      },
    });

    expect(entries.map((entry) => entry.weight)).toEqual([50, 25, 25]);
  });

  it("matches backend composite score for partial completion", () => {
    const stack = buildCompositeStackEntries({
      assessmentStack,
      assessmentSettings: {
        weights: {
          Typing: 40,
          "Situational judgement": 30,
          "Call simulation": 30,
        },
      },
    });

    const score = computeWeightedCompositeScore(stack, [
      { assessment: "Typing", numericScore: 80, assessmentStatus: "completed" },
      { assessment: "Situational judgement", numericScore: 60, assessmentStatus: "completed" },
    ]);

    expect(score).toBe(50);
  });
});

describe("getCampaignWeights", () => {
  it("distributes remainder when weights are not configured", () => {
    expect(getCampaignWeights(["A", "B", "C"])).toEqual({ A: 34, B: 33, C: 33 });
  });
});
