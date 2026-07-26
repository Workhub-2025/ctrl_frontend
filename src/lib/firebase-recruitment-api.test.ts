import { describe, expect, it } from "vitest";

import {
  createFirebaseRecruitmentApi,
  recruitmentIdempotencyKey,
  type FirebaseDomainRequester,
} from "@/lib/firebase-recruitment-api";
import { createFirebaseTenancyApi } from "@/lib/firebase-tenancy-api";
import { readHmOverviewOrgGeneration } from "@/lib/portal-cache-invalidation";
import type { CloudRunDomainRequest } from "@/lib/cloud-run-bff-client";

const stubDomainApi = (): FirebaseDomainRequester => ({
  async request<ResponseBody>() {
    return {} as ResponseBody;
  },
});

describe("Firebase recruitment domain adapter", () => {
  it("uses deterministic scoped idempotency keys", () => {
    const first = recruitmentIdempotencyKey("campaign:create", "user-1", {
      title: "Support",
      vacancyCount: 2,
    });
    const retry = recruitmentIdempotencyKey("campaign:create", "user-1", {
      title: "Support",
      vacancyCount: 2,
    });
    const otherActor = recruitmentIdempotencyKey("campaign:create", "user-2", {
      title: "Support",
      vacancyCount: 2,
    });

    expect(first).toHaveLength(64);
    expect(retry).toBe(first);
    expect(otherActor).not.toBe(first);
  });

  it("exposes named operations and forwards the opaque Firebase session", async () => {
    const requests: unknown[] = [];
    const domainApi: FirebaseDomainRequester = {
      async request<ResponseBody>(request: CloudRunDomainRequest) {
        requests.push(request);
        return {
          items: [],
          nextCursor: null,
        } as ResponseBody;
      },
    };
    const recruitment = createFirebaseRecruitmentApi(
      domainApi,
      "opaque-firebase-session",
    );

    await recruitment.listCampaigns("organization-1", 25);

    expect(requests).toEqual([{
      path: "/v1/campaigns?organizationId=organization-1&limit=25",
      firebaseSessionCookie: "opaque-firebase-session",
    }]);
    expect(recruitment).not.toHaveProperty("request");
  });

  it("never places a session access code in a URL", async () => {
    const requests: unknown[] = [];
    const domainApi: FirebaseDomainRequester = {
      async request<ResponseBody>(request: CloudRunDomainRequest) {
        requests.push(request);
        return {
          assignmentId: "assignment-1",
          sessionId: "session-1",
          alreadyLinked: false,
        } as ResponseBody;
      },
    };
    const recruitment = createFirebaseRecruitmentApi(
      domainApi,
      "opaque-firebase-session",
    );

    await recruitment.linkAccessCode({
      accessCode: "SECRET-CODE",
      idempotencyKey: "idempotency-key-1",
    });

    expect(requests).toEqual([{
      path: "/v1/sessions/access-code/link",
      method: "POST",
      firebaseSessionCookie: "opaque-firebase-session",
      body: {
        accessCode: "SECRET-CODE",
        idempotencyKey: "idempotency-key-1",
      },
    }]);
  });
});

describe("Screen aggregate invalidation on writes", () => {
  it("rotates the org generation after a recruitment write", async () => {
    const organizationId = "organization-invalidation-recruitment";
    const recruitment = createFirebaseRecruitmentApi(
      stubDomainApi(),
      "opaque-firebase-session",
      { organizationId },
    );

    const before = await readHmOverviewOrgGeneration(organizationId);
    await recruitment.createCampaign({ title: "Support" });
    const after = await readHmOverviewOrgGeneration(organizationId);

    expect(before).toBe("0");
    expect(after).not.toBe(before);
  });

  it("rotates the org generation after a tenancy write", async () => {
    const organizationId = "organization-invalidation-tenancy";
    const tenancy = createFirebaseTenancyApi(
      stubDomainApi(),
      "opaque-firebase-session",
      { organizationId },
    );

    const before = await readHmOverviewOrgGeneration(organizationId);
    await tenancy.createInvitation({
      organizationId,
      email: "seat@example.test",
      role: "hiring_manager",
      expiresAt: "2026-08-01T00:00:00.000Z",
    });
    const after = await readHmOverviewOrgGeneration(organizationId);

    expect(before).toBe("0");
    expect(after).not.toBe(before);
  });

  it("leaves the generation alone on reads", async () => {
    const organizationId = "organization-invalidation-reads";
    const recruitment = createFirebaseRecruitmentApi(
      stubDomainApi(),
      "opaque-firebase-session",
      { organizationId },
    );

    await recruitment.listCampaigns(organizationId, 25);

    expect(await readHmOverviewOrgGeneration(organizationId)).toBe("0");
  });
});
