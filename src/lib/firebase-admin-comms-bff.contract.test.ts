import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("Firebase admin comms + audit BFF", () => {
  it("sends broadcast preview and send through domainApi only", () => {
    for (const [source, path] of [
      [route("../app/api/admin/comms/preview/route.ts"), "/v1/admin/comms/preview"],
      [route("../app/api/admin/comms/send/route.ts"), "/v1/admin/comms/send"],
    ] as const) {
      expect(source).toContain("requireAdminDualAccess");
      expect(source).toContain("auth.domainApi.request");
      expect(source).toContain(path);
      expect(source).not.toContain("isFirebaseAdminAuth");
      expect(source).not.toContain("cmsRequest");
      expect(source).not.toMatch(/status:\s*501/);
      expect(source).not.toContain("isFirebaseAdminApiAuth");
    }
  });

  it("forwards contractTiers on operational-email preview", () => {
    const source = route("../app/api/admin/comms/preview/route.ts");
    expect(source).toContain("contractTiers");
    expect(source).toContain("body");
  });

  it("wires the admin audit log to organization audit events", () => {
    const source = route("../app/api/admin/audit-logs/route.ts");
    expect(source).toContain("requireAdminDualAccess");
    expect(source).toContain("getAdminAuditEvents");
    expect(source).toContain("toAdminAuditLogRows");
    expect(source).not.toContain("isFirebaseAdminAuth");
    expect(source).not.toMatch(/data:\s*\[\]/);
    expect(source).not.toContain("pending Chunk G");
  });
});
