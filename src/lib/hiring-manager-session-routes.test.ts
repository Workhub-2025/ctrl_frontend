import { describe, expect, it } from "vitest";
import {
  getHmAssessmentSessionCloseBffPath,
  getHmAssessmentSessionCloseStrapiPath,
  getHmCandidateSessionResendBffPath,
  getHmCandidateSessionResendStrapiPath,
} from "@/lib/hiring-manager-session-routes";

describe("hiring-manager session route helpers", () => {
  it("builds assessment-session close BFF and Strapi paths", () => {
    expect(getHmAssessmentSessionCloseBffPath("sess 1")).toBe(
      "/api/hiring-manager/sessions/sess%201/status"
    );
    expect(getHmAssessmentSessionCloseStrapiPath("sess 1")).toBe(
      "/hiring-manager/assessment-sessions/sess%201/close"
    );
  });

  it("builds candidate-session resend BFF and Strapi paths", () => {
    expect(getHmCandidateSessionResendBffPath("cs-9")).toBe(
      "/api/hiring-manager/candidate-sessions/cs-9/resend"
    );
    expect(getHmCandidateSessionResendStrapiPath("cs-9")).toBe(
      "/candidate-sessions/cs-9/resend"
    );
  });
});
