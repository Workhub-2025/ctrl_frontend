import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { rejectCrossOriginRequest } from "./origin-guard";

const originalEnvironment = { ...process.env };

describe("rejectCrossOriginRequest", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_URL", "https://ctrl-assess.co.uk");
    vi.stubEnv("VERCEL_URL", "ctrl-preview-team.vercel.app");
  });

  afterEach(() => {
    process.env = { ...originalEnvironment };
    vi.unstubAllEnvs();
  });

  it("accepts the exact configured production origin", () => {
    const request = new Request("https://ctrl-assess.co.uk/api/example", {
      method: "POST",
      headers: { origin: "https://ctrl-assess.co.uk" },
    });

    expect(rejectCrossOriginRequest(request)).toBeNull();
  });

  it("accepts the www sibling of the configured production origin", () => {
    const request = new Request("https://www.ctrl-assess.co.uk/api/example", {
      method: "POST",
      headers: { origin: "https://www.ctrl-assess.co.uk" },
    });

    expect(rejectCrossOriginRequest(request)).toBeNull();
  });

  it("accepts the exact Vercel deployment origin for preview mutations", () => {
    const request = new Request(
      "https://ctrl-preview-team.vercel.app/api/example",
      {
        method: "POST",
        headers: { origin: "https://ctrl-preview-team.vercel.app" },
      },
    );

    expect(rejectCrossOriginRequest(request)).toBeNull();
  });

  it("rejects lookalike and cross-site origins", async () => {
    const request = new Request(
      "https://ctrl-preview-team.vercel.app/api/example",
      {
        method: "POST",
        headers: { origin: "https://ctrl-preview-team.vercel.app.attacker.test" },
      },
    );

    const response = rejectCrossOriginRequest(request);
    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toEqual({ error: "Forbidden" });
  });
});
