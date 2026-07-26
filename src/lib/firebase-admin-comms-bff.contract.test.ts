import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("Firebase admin comms + audit BFF", () => {
  it("dual-paths broadcast preview and send through the Firebase domainApi", () => {
    for (const [source, path] of [
      [route("../app/api/admin/comms/preview/route.ts"), "/v1/admin/comms/preview"],
      [route("../app/api/admin/comms/send/route.ts"), "/v1/admin/comms/send"],
    ] as const) {
      expect(source).toContain("requireAdminDualAccess");
      expect(source).toContain("isFirebaseAdminAuth");
      expect(source).toContain("auth.domainApi.request");
      expect(source).toContain(path);
      // Legacy production CMS path is retained for the non-Firebase branch.
      expect(source).toContain("cmsRequest");
      // The Firebase Preview 501 branch must be gone.
      expect(source).not.toMatch(/status:\s*501/);
      expect(source).not.toContain("isFirebaseAdminApiAuth");
    }
  });

  it("wires the admin audit log Firebase path to organization audit events", () => {
    const source = route("../app/api/admin/audit-logs/route.ts");
    expect(source).toContain("requireAdminDualAccess");
    expect(source).toContain("isFirebaseAdminAuth");
    expect(source).toContain("audit-events");
    expect(source).toContain("toAdminAuditLogRows");
    // The empty-stub response must be gone.
    expect(source).not.toMatch(/data:\s*\[\]/);
    expect(source).not.toContain("pending Chunk G");
  });
});
