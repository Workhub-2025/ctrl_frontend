import { describe, expect, it } from "vitest";
import {
  computeIntegrityScoreFromViolationCount,
  isIntegrityViolationEvent,
} from "@/lib/integrity-events";

describe("integrity event scoring", () => {
  it("treats focus/blur violations as countable", () => {
    expect(isIntegrityViolationEvent("tab_hidden")).toBe(true);
    expect(isIntegrityViolationEvent("copy_attempt")).toBe(true);
    expect(isIntegrityViolationEvent("heartbeat")).toBe(false);
    expect(isIntegrityViolationEvent("assessment_started")).toBe(false);
  });

  it("computes score from violation count with 5-point penalty", () => {
    expect(computeIntegrityScoreFromViolationCount(0)).toBe(100);
    expect(computeIntegrityScoreFromViolationCount(2)).toBe(90);
    expect(computeIntegrityScoreFromViolationCount(25)).toBe(0);
  });
});
