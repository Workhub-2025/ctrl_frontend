import { afterEach, describe, expect, it, vi } from "vitest";

const upstashPipeline = vi.fn();
const isUpstashConfigured = vi.fn();

vi.mock("@/lib/security/upstash-rest", () => ({
  isUpstashConfigured: () => isUpstashConfigured(),
  upstashPipeline: (...args: unknown[]) => upstashPipeline(...args),
}));

import { applyRateLimit } from "./api-rate-limit";

describe("Upstash rate limit pipeline", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("counts with one Redis round trip", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    isUpstashConfigured.mockReturnValue(true);
    upstashPipeline.mockResolvedValue([3, 0, 42_000]);

    const result = await applyRateLimit({
      key: "portal-read:hm-overview:user:1:org:org-1",
      limit: 30,
      windowMs: 60_000,
    });

    expect(result).toMatchObject({
      allowed: true,
      remaining: 27,
      backend: "upstash",
    });
    expect(upstashPipeline).toHaveBeenCalledTimes(1);
    expect(upstashPipeline.mock.calls[0]?.[0]).toEqual([
      ["INCR", "rate:preview:portal-read:hm-overview:user:1:org:org-1"],
      ["PEXPIRE", "rate:preview:portal-read:hm-overview:user:1:org:org-1", 60_000, "NX"],
      ["PTTL", "rate:preview:portal-read:hm-overview:user:1:org:org-1"],
    ]);
  });
});
