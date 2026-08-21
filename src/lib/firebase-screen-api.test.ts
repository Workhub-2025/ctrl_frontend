import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { CloudRunDomainRequest } from "@/lib/cloud-run-bff-client";
import type { FirebaseDomainRequester } from "@/lib/firebase-recruitment-api";
import {
  createFirebaseScreenApi,
  toReportsByAssignmentId,
} from "@/lib/firebase-screen-api";

const route = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

function recordingDomainApi(response: unknown) {
  const requests: CloudRunDomainRequest[] = [];
  const domainApi: FirebaseDomainRequester = {
    async request<ResponseBody>(request: CloudRunDomainRequest) {
      requests.push(request);
      return response as ResponseBody;
    },
  };
  return { domainApi, requests };
}

describe("Firebase screen aggregates", () => {
  it("loads the hiring-manager overview in a single authenticated call", async () => {
    const { domainApi, requests } = recordingDomainApi({
      campaigns: [],
      reports: {},
    });
    const screens = createFirebaseScreenApi(domainApi, "opaque-session");

    await screens.getHiringManagerOverview();

    expect(requests).toEqual([
      {
        path: "/v1/screens/hm-overview",
        firebaseSessionCookie: "opaque-session",
      },
    ]);
  });

  it("loads the client dashboard in a single authenticated call", async () => {
    const { domainApi, requests } = recordingDomainApi({
      workspace: {},
      campaigns: [],
      releasedAssignmentCount: 0,
    });
    const screens = createFirebaseScreenApi(domainApi, "opaque-session");

    await screens.getClientDashboard();

    expect(requests).toEqual([
      {
        path: "/v1/screens/client-dashboard",
        firebaseSessionCookie: "opaque-session",
      },
    ]);
  });

  it("loads shared candidates in a single authenticated call", async () => {
    const { domainApi, requests } = recordingDomainApi({
      items: [],
    });
    const screens = createFirebaseScreenApi(domainApi, "opaque-session");

    await screens.getClientSharedCandidates();

    expect(requests).toEqual([
      {
        path: "/v1/screens/client-shared-candidates",
        firebaseSessionCookie: "opaque-session",
      },
    ]);
  });

  it("converts the report map into the lookup the mappers expect", () => {
    const reports = toReportsByAssignmentId({
      "assignment-1": [],
      "assignment-2": [],
    });

    expect(reports.get("assignment-1")).toEqual([]);
    expect(reports.get("missing")).toBeUndefined();
    expect([...reports.keys()]).toEqual(["assignment-1", "assignment-2"]);
  });

  it("normalizes admin overview whether the BFF already unwrapped data", async () => {
    const card = {
      id: "org-1",
      legalName: "Acme",
      activeSeats: 1,
      pendingUpgradesCount: 0,
      contractSummary: null,
    };

    const unwrapped = recordingDomainApi({
      organizations: [card],
      totalOrganizations: 1,
    });
    await expect(
      createFirebaseScreenApi(unwrapped.domainApi, "opaque-session").getAdminOverview(),
    ).resolves.toEqual({
      organizations: [card],
      totalOrganizations: 1,
    });

    const wrapped = recordingDomainApi({
      data: { organizations: [card], totalOrganizations: 1 },
    });
    await expect(
      createFirebaseScreenApi(wrapped.domainApi, "opaque-session").getAdminOverview(),
    ).resolves.toEqual({
      organizations: [card],
      totalOrganizations: 1,
    });

    const empty = recordingDomainApi(undefined);
    await expect(
      createFirebaseScreenApi(empty.domainApi, "opaque-session").getAdminOverview(),
    ).resolves.toEqual({
      organizations: [],
      totalOrganizations: 0,
    });
  });
});

describe("Portal screen BFF routes", () => {
  it("hiring-manager overview reads the aggregate instead of fanning out", () => {
    const source = route("../app/api/hiring-manager/overview/route.ts");

    expect(source).toContain("createFirebaseScreenApi");
    expect(source).toContain("getHiringManagerOverview");
    // The per-campaign and per-assignment fan-out is gone.
    expect(source).not.toContain("recruitment.listCampaigns");
    expect(source).not.toContain("recruitment.getCampaign");
    expect(source).not.toContain("recruitment.listAssignments");
    expect(source).not.toContain("/report");
    // Existing view mappers are reused unchanged.
    expect(source).toContain("toHiringManagerCampaignDetail");
    expect(source).toContain("toHiringManagerSession");
  });

  it("client dashboard reads the aggregate instead of fanning out", () => {
    const source = route("../app/api/client/dashboard/route.ts");

    expect(source).toContain("createFirebaseScreenApi");
    expect(source).toContain("getClientDashboard");
    expect(source).not.toContain("recruitment.listCampaigns");
    expect(source).not.toContain("listAssignments");
    expect(source).toContain("toClientOverviewFromScreen");
  });

  it("client overview is a thin alias of the dashboard route", () => {
    const source = route("../app/api/client/overview/route.ts");
    expect(source).toContain("getClientDashboard");
  });

  it("shared candidates reads the screen aggregate instead of fanning out", () => {
    const source = route("../app/api/client/shared-candidates/route.ts");

    expect(source).toContain("createFirebaseScreenApi");
    expect(source).toContain("getClientSharedCandidates");
    expect(source).not.toContain("recruitment.listCampaigns");
    expect(source).not.toContain("recruitment.listAssignments");
    expect(source).not.toContain("recruitment.getAssignment");
  });

  it("both screens cache on the org generation, not on a bare TTL", () => {
    for (const source of [
      route("../app/api/hiring-manager/overview/route.ts"),
      route("../app/api/client/dashboard/route.ts"),
    ]) {
      expect(source).toContain("portalServerCacheGetOrSet");
      expect(source).toContain("readHmOverviewOrgGeneration");
      expect(source).toContain("CacheKeyWithGeneration");
      expect(source).toContain("context.firebaseUid");
    }
  });
});
