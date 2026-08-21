import { describe, expect, it, vi } from "vitest";
import {
  invalidateHmOverviewServerCache,
  invalidateClientPortalServerCache,
  invalidateFirebaseClientPortalCaches,
  invalidateClientEntitlementCaches,
  readHmOverviewOrgGeneration,
} from "./portal-cache-invalidation";

vi.mock("@/lib/portal-server-auth", () => ({
  getServerAuthSub: vi.fn().mockResolvedValue("mock-sub"),
}));

vi.mock("@/lib/portal-server-cache", () => ({
  portalServerCacheDel: vi.fn().mockResolvedValue(undefined),
  portalServerCacheDelMany: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/security/upstash-rest", () => ({
  isUpstashConfigured: vi.fn().mockReturnValue(false),
  upstashGet: vi.fn().mockResolvedValue(null),
  upstashSet: vi.fn().mockResolvedValue(undefined),
}));

describe("portal cache invalidation F26 fixes", () => {
  it("uses the persistence service generation when it is newer than the local cache", async () => {
    await expect(
      readHmOverviewOrgGeneration("org-persistence-generation-test", {
        persistenceGeneration: "200",
      }),
    ).resolves.toBe("200");
  });

  it("invalidateHmOverviewServerCache bumps org generation when organizationId is provided", async () => {
    const orgId = "org-hm-overview-test";
    const initialGen = await readHmOverviewOrgGeneration(orgId);
    expect(initialGen).toBe("0");

    await invalidateHmOverviewServerCache("user-1", orgId);
    const newGen = await readHmOverviewOrgGeneration(orgId);
    expect(newGen).not.toBe("0");
  });

  it("invalidateClientPortalServerCache bumps org generation when organizationId is provided", async () => {
    const orgId = "org-client-portal-test";
    const initialGen = await readHmOverviewOrgGeneration(orgId);
    expect(initialGen).toBe("0");

    await invalidateClientPortalServerCache("user-1", orgId);
    const newGen = await readHmOverviewOrgGeneration(orgId);
    expect(newGen).not.toBe("0");
  });

  it("invalidateFirebaseClientPortalCaches bumps org generation when organizationId is provided even if firebaseUid is empty", async () => {
    const orgId = "org-firebase-portal-test";
    const initialGen = await readHmOverviewOrgGeneration(orgId);
    expect(initialGen).toBe("0");

    await invalidateFirebaseClientPortalCaches({
      firebaseUid: "",
      organizationId: orgId,
    });
    const newGen = await readHmOverviewOrgGeneration(orgId);
    expect(newGen).not.toBe("0");
  });

  it("invalidateClientEntitlementCaches bumps org generation when organizationId is provided", async () => {
    const orgId = "org-client-entitlement-test";
    const initialGen = await readHmOverviewOrgGeneration(orgId);
    expect(initialGen).toBe("0");

    await invalidateClientEntitlementCaches({
      clientDocumentId: "client-123",
      userSub: "user-1",
      organizationId: orgId,
    });
    const newGen = await readHmOverviewOrgGeneration(orgId);
    expect(newGen).not.toBe("0");
  });
});
