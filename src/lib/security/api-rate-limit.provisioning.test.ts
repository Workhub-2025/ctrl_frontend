import { afterEach, describe, expect, it, vi } from "vitest";
import { accountProvisioningRateLimit } from "./api-rate-limit";

describe("accountProvisioningRateLimit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps production provisioning tight", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(accountProvisioningRateLimit()).toEqual({
      limit: 10,
      windowMs: 60 * 60 * 1_000,
    });
  });

  it("raises the Preview rehearsal ceiling", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(accountProvisioningRateLimit()).toEqual({
      limit: 30,
      windowMs: 60 * 60 * 1_000,
    });
  });
});
