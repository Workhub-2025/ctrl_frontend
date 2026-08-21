import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createCachedIdentityTokenProvider,
  getFirebaseDomainEnvironment,
} from "@/lib/firebase-domain-api";

const VALID_ENVIRONMENT = {
  DOMAIN_API_URL:
    "https://europe-west2-ctrl-assess.cloudfunctions.net/domainApi",
  GOOGLE_WORKLOAD_IDENTITY_PROVIDER:
    "//iam.googleapis.com/projects/765430607081/locations/global/workloadIdentityPools/ctrl-staging-vercel/providers/vercel",
  GOOGLE_SERVICE_ACCOUNT_EMAIL:
    "ctrl-staging-vercel-invoker@ctrl-assess.iam.gserviceaccount.com",
} as const;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("domain API environment", () => {
  it("accepts only the keyless WIF configuration", () => {
    for (const [name, value] of Object.entries(VALID_ENVIRONMENT)) {
      vi.stubEnv(name, value);
    }

    expect(getFirebaseDomainEnvironment()).toEqual({
      baseUrl: VALID_ENVIRONMENT.DOMAIN_API_URL,
      workloadIdentityProvider:
        VALID_ENVIRONMENT.GOOGLE_WORKLOAD_IDENTITY_PROVIDER,
      invokerServiceAccount: VALID_ENVIRONMENT.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    });
  });

  it("rejects an insecure remote Function URL", () => {
    for (const [name, value] of Object.entries(VALID_ENVIRONMENT)) {
      vi.stubEnv(name, value);
    }
    vi.stubEnv("DOMAIN_API_URL", "http://domain-api.example.test");

    expect(() => getFirebaseDomainEnvironment()).toThrow("must use HTTPS");
  });

  it("accepts the legacy Firebase URL during a zero-downtime environment cutover", () => {
    vi.stubEnv("DOMAIN_API_URL", "");
    vi.stubEnv(
      "FIREBASE_DOMAIN_API_URL",
      "https://europe-west2-ctrl-assess.cloudfunctions.net/domainApi",
    );
    vi.stubEnv(
      "GOOGLE_WORKLOAD_IDENTITY_PROVIDER",
      VALID_ENVIRONMENT.GOOGLE_WORKLOAD_IDENTITY_PROVIDER,
    );
    vi.stubEnv(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL",
      VALID_ENVIRONMENT.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    );

    expect(getFirebaseDomainEnvironment().baseUrl).toBe(
      "https://europe-west2-ctrl-assess.cloudfunctions.net/domainApi",
    );
  });
});

describe("Google identity token cache", () => {
  const audience = "https://domainapi-jlgl6r4i7a-nw.a.run.app";

  it("mints once per audience inside the cache window", async () => {
    const mint = vi.fn(async (target: string) => `token-for-${target}`);
    let clock = 0;
    const provider = createCachedIdentityTokenProvider(mint, {
      ttlMs: 300_000,
      now: () => clock,
    });

    await expect(provider(audience)).resolves.toBe(`token-for-${audience}`);
    clock = 299_999;
    await expect(provider(audience)).resolves.toBe(`token-for-${audience}`);
    expect(mint).toHaveBeenCalledTimes(1);

    clock = 300_001;
    await provider(audience);
    expect(mint).toHaveBeenCalledTimes(2);
  });

  it("caches per audience rather than globally", async () => {
    const mint = vi.fn(async (target: string) => `token-for-${target}`);
    const provider = createCachedIdentityTokenProvider(mint, { now: () => 0 });

    await provider(audience);
    await provider("https://other-service.run.app");
    await provider(audience);

    expect(mint).toHaveBeenCalledTimes(2);
  });

  it("collapses concurrent callers onto one mint", async () => {
    let release: (token: string) => void = () => {};
    const mint = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    );
    const provider = createCachedIdentityTokenProvider(mint, { now: () => 0 });

    const waiters = Promise.all([provider(audience), provider(audience)]);
    release("shared-token");

    await expect(waiters).resolves.toEqual(["shared-token", "shared-token"]);
    expect(mint).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed mint", async () => {
    const mint = vi
      .fn<(target: string) => Promise<string>>()
      .mockRejectedValueOnce(new Error("STS unavailable"))
      .mockResolvedValueOnce("recovered-token");
    const provider = createCachedIdentityTokenProvider(mint, { now: () => 0 });

    await expect(provider(audience)).rejects.toThrow("STS unavailable");
    await expect(provider(audience)).resolves.toBe("recovered-token");
    expect(mint).toHaveBeenCalledTimes(2);
  });

  it("expires well inside the 600s impersonated token lifetime", async () => {
    const mint = vi.fn(async () => "token");
    let clock = 0;
    const provider = createCachedIdentityTokenProvider(mint, {
      now: () => clock,
    });

    await provider(audience);
    clock = 599_000;
    await provider(audience);

    // A default TTL at or above the token lifetime would serve an expired
    // credential to Cloud Run.
    expect(mint).toHaveBeenCalledTimes(2);
  });
});
