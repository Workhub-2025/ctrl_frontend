import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAdminClientStrapiPath,
  getAdminClientStrapiUrl,
} from "@/lib/admin-client-routes";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("admin client Strapi route helpers", () => {
  it("builds admin client paths with encoded document ids", () => {
    expect(getAdminClientStrapiPath("client document", "seat-slots")).toBe(
      "/admin/clients/client%20document/seat-slots"
    );
  });

  it("does not duplicate /api when STRAPI_API_URL already includes it", () => {
    vi.stubEnv("STRAPI_API_URL", "https://be.ctrl-assess.co.uk/api");

    expect(getAdminClientStrapiUrl("client-123", "export-seats")).toBe(
      "https://be.ctrl-assess.co.uk/api/admin/clients/client-123/export-seats"
    );
  });

  it("adds /api when STRAPI_API_URL points at the Strapi host root", () => {
    vi.stubEnv("STRAPI_API_URL", "http://localhost:1337");

    expect(getAdminClientStrapiUrl("client-123", "/downgrade-seat")).toBe(
      "http://localhost:1337/api/admin/clients/client-123/downgrade-seat"
    );
  });
});
