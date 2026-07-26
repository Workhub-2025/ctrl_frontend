import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("assessment runtime BFF boundary", () => {
  it("authenticates the generic runtime proxy with the Firebase candidate session", () => {
    const source = readFileSync(
      join(root, "src/lib/firebase-assessment-runtime-server.ts"),
      "utf8",
    );
    expect(source).toContain('requireFirebaseSession("candidate")');
    expect(source).toContain("auth.domainApi.request");
    expect(source).toContain("auth.firebaseSessionCookie");
    expect(source).not.toMatch(/strapi|jwt/i);
  });

  it("has no reachable v1 candidate pages or legacy submit handlers", () => {
    const removed = [
      "src/app/assessment/typing/page.tsx",
      "src/app/api/assessment/[slug]/submit/route.ts",
      "src/app/api/assessment/prioritization/submit/route.ts",
      "src/app/api/assessment/situational-judgement/submit/route.ts",
      "src/app/api/assessment/typing/submit/route.ts",
    ];
    for (const path of removed) expect(existsSync(join(root, path)), path).toBe(false);
  });

  it("streams assessment audio through an authenticated BFF route", () => {
    const source = readFileSync(
      join(root, "src/app/api/assessment-runtime/media/[mediaId]/route.ts"),
      "utf8"
    );
    expect(source).toContain('requireFirebaseSession("candidate")');
    expect(source).toContain("auth.domainApi.request");
    expect(source).toContain('signedUrl.hostname !== "storage.googleapis.com"');
    expect(source).not.toMatch(/getServerCmsJwt|joinCmsApiPath/);
    expect(source).not.toContain('slug !== "call-simulation"');
    expect(source).not.toContain('release !== "2.0.0"');
  });

  it("blocks assessment start and restart without a supported desktop device check", () => {
    const route = readFileSync(
      join(root, "src/app/api/assessment-runtime/[...segments]/route.ts"),
      "utf8",
    );
    const client = readFileSync(
      join(root, "src/lib/assessment-runtime-client.ts"),
      "utf8",
    );

    expect(route).toContain("isSupportedAssessmentDeviceRequest");
    expect(route).toContain("launchesAttempt");
    expect(route).toContain("desktop or laptop with a physical keyboard");
    expect(client).toContain("assessmentDeviceRequestHeaders");
  });
});
