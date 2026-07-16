import { describe, expect, it } from "vitest";
import {
  getClientSharedCandidateReopenBffPath,
  getClientSharedCandidateStatusBffPath,
} from "@/lib/client-shared-candidate-routes";

describe("client shared-candidate route helpers", () => {
  it("uses the status BFF endpoint for review-state updates", () => {
    expect(getClientSharedCandidateStatusBffPath("shared candidate")).toBe(
      "/api/client/shared-candidates/shared%20candidate/status"
    );
  });

  it("uses the dedicated reasoned reopen endpoint for final outcomes", () => {
    expect(getClientSharedCandidateReopenBffPath("shared candidate")).toBe(
      "/api/client/shared-candidates/shared%20candidate/reopen"
    );
  });
});
