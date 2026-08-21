import { describe, expect, it } from "vitest";
import {
  getHmAssessmentSessionCloseBffPath,
  getHmCandidateSessionResendBffPath,
} from "@/lib/hiring-manager-session-routes";

describe("hiring-manager session route helpers", () => {
  it("builds assessment-session close BFF path", () => {
    expect(getHmAssessmentSessionCloseBffPath("sess 1")).toBe(
      "/api/hiring-manager/sessions/sess%201/status"
    );
  });

  it("builds candidate-session resend BFF path", () => {
    expect(getHmCandidateSessionResendBffPath("cs-9")).toBe(
      "/api/hiring-manager/candidate-sessions/cs-9/resend"
    );
  });
});
