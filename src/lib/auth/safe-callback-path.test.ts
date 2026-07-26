import { describe, expect, it } from "vitest";
import { safeCallbackPath } from "./safe-callback-path";

describe("safeCallbackPath", () => {
  it("keeps same-origin paths including query and hash", () => {
    expect(safeCallbackPath("/candidate/assessments?tab=open#next")).toBe(
      "/candidate/assessments?tab=open#next",
    );
  });

  it.each([
    "https://attacker.example/phish",
    "//attacker.example/phish",
    "/\\attacker.example/phish",
    "/candidate\\..\\admin",
    "candidate/dashboard",
    "/candidate/dashboard\n//attacker.example",
  ])("rejects unsafe callback %s", (value) => {
    expect(safeCallbackPath(value)).toBeNull();
  });
});
