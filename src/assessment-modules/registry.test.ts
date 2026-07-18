import { describe, expect, it } from "vitest";
import { getAssessmentRenderer, listAssessmentModuleSlugs, supportsReleaseMajor } from "./registry";

describe("assessment module renderer registry", () => {
  it("registers only active v2 modules", () => {
    expect(listAssessmentModuleSlugs()).toEqual([
      "call-simulation",
      "prioritisation",
      "short-term-memory",
      "situational-judgement",
      "typing",
    ]);
  });

  it("rejects unsupported release majors", () => {
    expect(getAssessmentRenderer("call-simulation")?.stageRenderers["custom:call-record"]).toBeTruthy();
    expect(supportsReleaseMajor("call-simulation", "2.0.0")).toBe(true);
    expect(supportsReleaseMajor("call-simulation", "3.0.0")).toBe(false);
    for (const slug of listAssessmentModuleSlugs()) {
      expect(getAssessmentRenderer(slug)?.ReadinessComponent).toBeTypeOf("function");
      expect(supportsReleaseMajor(slug, "2.0.1")).toBe(true);
    }
  });
});
