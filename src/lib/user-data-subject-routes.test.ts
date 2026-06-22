import { describe, expect, it } from "vitest";
import {
  guardAuthenticatedApiRoute,
} from "@/lib/auth/bff-api-middleware";

describe("user data subject BFF routes", () => {
  it("requires authentication for data export", () => {
    expect(guardAuthenticatedApiRoute("/api/user/data-export", false)?.status).toBe(401);
    expect(guardAuthenticatedApiRoute("/api/user/data-export", true)).toBeNull();
  });

  it("requires authentication for erasure requests", () => {
    expect(guardAuthenticatedApiRoute("/api/user/erasure-request", false)?.status).toBe(401);
    expect(guardAuthenticatedApiRoute("/api/user/erasure-request", true)).toBeNull();
  });
});

describe("UK legal footer links", () => {
  it("includes core compliance pages", async () => {
    const { UK_LEGAL_FOOTER_LINKS } = await import("@/lib/legal/uk-compliance");
    const hrefs = UK_LEGAL_FOOTER_LINKS.map((link) => link.href);
    expect(hrefs).toContain("/privacy-policy");
    expect(hrefs).toContain("/sub-processors");
    expect(hrefs).toContain("/accessibility-statement");
    expect(hrefs).toContain("/data-processing-agreement");
  });
});
