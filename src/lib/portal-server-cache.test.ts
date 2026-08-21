import { afterEach, describe, expect, it, vi } from "vitest";

const upstashGetJson = vi.fn();
const upstashSetJson = vi.fn();
const upstashDel = vi.fn();
const isUpstashConfigured = vi.fn();

vi.mock("@/lib/security/upstash-rest", () => ({
  isUpstashConfigured: () => isUpstashConfigured(),
  upstashGetJson: (...args: unknown[]) => upstashGetJson(...args),
  upstashSetJson: (...args: unknown[]) => upstashSetJson(...args),
  upstashDel: (...args: unknown[]) => upstashDel(...args),
}));

import {
  portalServerCacheDel,
  portalServerCacheGetOrSet,
} from "./portal-server-cache";

describe("portal server cache", () => {
  afterEach(async () => {
    await portalServerCacheDel("memory-first-key");
    await portalServerCacheDel("upstash-hit-key");
    await portalServerCacheDel("factory-key");
    vi.clearAllMocks();
  });

  it("serves a warm isolate from memory without calling Upstash again", async () => {
    isUpstashConfigured.mockReturnValue(true);
    upstashGetJson.mockResolvedValue("from-redis");
    upstashSetJson.mockResolvedValue(true);

    await expect(
      portalServerCacheGetOrSet("memory-first-key", 60_000, async () => "factory"),
    ).resolves.toBe("from-redis");
    await expect(
      portalServerCacheGetOrSet("memory-first-key", 60_000, async () => "factory"),
    ).resolves.toBe("from-redis");

    expect(upstashGetJson).toHaveBeenCalledTimes(1);
  });

  it("writes memory immediately and does not block the miss path on Redis SET", async () => {
    isUpstashConfigured.mockReturnValue(true);
    upstashGetJson.mockResolvedValue(null);
    let resolveSet: ((value: boolean) => void) | undefined;
    upstashSetJson.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveSet = resolve;
        }),
    );

    const factory = vi.fn(async () => ({ campaigns: 12 }));
    const value = await portalServerCacheGetOrSet("factory-key", 60_000, factory);

    expect(value).toEqual({ campaigns: 12 });
    expect(factory).toHaveBeenCalledTimes(1);
    expect(upstashSetJson).toHaveBeenCalledTimes(1);

    await expect(
      portalServerCacheGetOrSet("factory-key", 60_000, factory),
    ).resolves.toEqual({ campaigns: 12 });
    expect(factory).toHaveBeenCalledTimes(1);

    resolveSet?.(true);
  });
});
