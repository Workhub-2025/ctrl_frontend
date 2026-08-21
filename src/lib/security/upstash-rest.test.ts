import { afterEach, describe, expect, it, vi } from "vitest";

import { upstashSetJson } from "./upstash-rest";

const originalFetch = globalThis.fetch;

describe("upstash REST command body", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("SET puts the payload in the JSON body instead of the URL", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.upstash.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ result: "OK" }), { status: 200 }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const bulky = { overview: "x".repeat(8_000) };

    await expect(
      upstashSetJson("portal:hm:overview:user:1:g:1", bulky, 90_000),
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://redis.upstash.example");
    expect(url).not.toContain("overview");
    expect(JSON.parse(String(init.body))).toEqual([
      "SET",
      "portal:hm:overview:user:1:g:1",
      JSON.stringify(bulky),
      "PX",
      90_000,
    ]);
  });
});
