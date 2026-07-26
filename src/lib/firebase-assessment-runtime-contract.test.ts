import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const adapter = readFileSync(
  new URL("./firebase-assessment-runtime-server.ts", import.meta.url),
  "utf8",
);
const runtimeRoute = readFileSync(
  new URL("../app/api/assessment-runtime/[...segments]/route.ts", import.meta.url),
  "utf8",
);
const mediaRoute = readFileSync(
  new URL(
    "../app/api/assessment-runtime/media/[mediaId]/route.ts",
    import.meta.url,
  ),
  "utf8",
);
const hiringManagerReportRoute = readFileSync(
  new URL(
    "../app/api/hiring-manager/candidate-sessions/[candidateSessionId]/report/route.ts",
    import.meta.url,
  ),
  "utf8",
);

describe("Firebase assessment runtime BFF", () => {
  it("uses the named Firebase domain adapter without a Strapi credential", () => {
    expect(adapter).toContain('requireFirebaseSession("candidate")');
    expect(adapter).toContain("auth.domainApi.request");
    expect(adapter).not.toMatch(/strapi|jwt/i);
    expect(runtimeRoute).toContain("forwardFirebaseAssessmentRuntime");
    expect(runtimeRoute).not.toMatch(/strapi|jwt/i);
  });

  it("keeps signed media URLs server-side and restricts their host", () => {
    expect(mediaRoute).toContain('signedUrl.hostname !== "storage.googleapis.com"');
    expect(mediaRoute).toContain("auth.domainApi.request");
    expect(mediaRoute).not.toMatch(/getServerCmsJwt|joinCmsApiPath/);
  });

  it("loads the hiring-manager report projection and computes its composite", () => {
    expect(hiringManagerReportRoute).toContain(
      "/v1/assessment-runtime/assignments/",
    );
    expect(hiringManagerReportRoute).toContain(
      "computeDecisionReadyCompositeScore",
    );
    expect(hiringManagerReportRoute).toContain("firebaseSessionCookie");
    expect(hiringManagerReportRoute).not.toMatch(
      /results:\s*\[\]|compositeScore:\s*null/,
    );
    expect(hiringManagerReportRoute).not.toMatch(/strapi|jwt/i);
  });
});
