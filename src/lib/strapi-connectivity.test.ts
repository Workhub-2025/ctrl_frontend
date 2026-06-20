import { afterEach, describe, expect, it, vi } from "vitest";

import { validateStrapiApiUrlForServerless } from "@/lib/strapi-connectivity";

describe("validateStrapiApiUrlForServerless", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects the frontend app URL as the Strapi API URL", () => {
    vi.stubEnv("STRAPI_API_URL", "https://www.ctrl-assess.co.uk/api");
    vi.stubEnv("NEXTAUTH_URL", "https://www.ctrl-assess.co.uk");

    const issue = validateStrapiApiUrlForServerless();

    expect(issue).toMatchObject({
      code: "frontend",
      configuredUrl: "https://www.ctrl-assess.co.uk/api",
    });
    expect(issue?.message).toContain("https://be.ctrl-assess.co.uk/api");
  });

  it("allows the production backend URL from the frontend app", () => {
    vi.stubEnv("STRAPI_API_URL", "https://be.ctrl-assess.co.uk/api");
    vi.stubEnv("NEXTAUTH_URL", "https://www.ctrl-assess.co.uk");

    expect(validateStrapiApiUrlForServerless()).toBeNull();
  });

  it("rejects a same-origin Vercel URL", () => {
    vi.stubEnv("STRAPI_API_URL", "https://ctrl-preview.vercel.app/api");
    vi.stubEnv("VERCEL_URL", "ctrl-preview.vercel.app");

    expect(validateStrapiApiUrlForServerless()?.code).toBe("frontend");
  });
});
