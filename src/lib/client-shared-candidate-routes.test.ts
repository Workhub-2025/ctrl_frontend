import { describe, expect, it } from "vitest";
import { getClientSharedCandidateStatusBffPath } from "@/lib/client-shared-candidate-routes";

describe("client shared-candidate route helpers", () => {
  it("uses the status BFF endpoint for review-state updates", () => {
    expect(getClientSharedCandidateStatusBffPath("shared candidate")).toBe(
      "/api/client/shared-candidates/shared%20candidate/status"
    );
  });
});
