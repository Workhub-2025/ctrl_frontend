import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("Firebase assessment recovery BFF", () => {
  it("uses an administrator Firebase session for bounded list and search", () => {
    for (const source of [
      route("../app/api/admin/assessment-attempts/route.ts"),
      route("../app/api/admin/assessment-attempts/search/route.ts"),
    ]) {
      expect(source).toContain('requireFirebaseSession("admin")');
      expect(source).toContain("/v1/assessment-runtime/admin/attempts");
      expect(source).toContain("auth.firebaseSessionCookie");
      expect(source).not.toMatch(/strapi|jwt|assessment-attempt-server/i);
    }
  });

  it("guards force-abandon mutations and uses the privileged Firebase route", () => {
    const source = route(
      "../app/api/admin/assessment-attempts/force-abandon/route.ts",
    );
    expect(source).toContain("rejectMutatingCrossOrigin");
    expect(source).toContain('requireFirebaseSession("admin")');
    expect(source).toContain(
      "/v1/assessment-runtime/admin/attempts/force-abandon",
    );
    expect(source).not.toMatch(/strapi|jwt|assessment-attempt-server/i);
  });
});
