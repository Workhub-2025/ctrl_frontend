import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Firebase candidate invitation BFF contract", () => {
  it("uses only named candidate provisioning and acceptance operations", () => {
    const domainApi = readFileSync(
      join(process.cwd(), "src/lib/firebase-domain-api.ts"),
      "utf8",
    );
    const provisionRoute = readFileSync(
      join(
        process.cwd(),
        "src/app/api/onboarding/candidate-account/route.ts",
      ),
      "utf8",
    );
    const acceptRoute = readFileSync(
      join(
        process.cwd(),
        "src/app/api/assignments/invitations/accept/route.ts",
      ),
      "utf8",
    );

    expect(domainApi).toContain("provisionCandidateAccount(");
    expect(domainApi).toContain('path: "/v1/onboarding/candidate-account"');
    expect(domainApi).toContain("acceptCandidateInvitation(");
    expect(domainApi).toContain(
      'path: "/v1/assignments/invitations/accept"',
    );
    expect(provisionRoute).toContain(".provisionCandidateAccount(");
    expect(acceptRoute).toContain(".acceptCandidateInvitation(");
    expect(acceptRoute).toContain('userContext.portalRole !== "candidate"');
  });

  it("keeps public token and email failures non-enumerating", () => {
    const provisionRoute = readFileSync(
      join(
        process.cwd(),
        "src/app/api/onboarding/candidate-account/route.ts",
      ),
      "utf8",
    );
    const acceptRoute = readFileSync(
      join(
        process.cwd(),
        "src/app/api/assignments/invitations/accept/route.ts",
      ),
      "utf8",
    );

    expect(provisionRoute).toContain("GENERIC_ACTIVATION_ERROR");
    expect(provisionRoute).toContain("does not disclose whether a token");
    expect(provisionRoute).not.toContain("handleBffRouteError");
    expect(acceptRoute).toContain("GENERIC_ACCEPTANCE_ERROR");
    expect(acceptRoute).not.toContain("handleBffRouteError");
    expect(provisionRoute).toContain('"cache-control": "no-store"');
    expect(acceptRoute).toContain('"cache-control": "no-store"');
  });
});
