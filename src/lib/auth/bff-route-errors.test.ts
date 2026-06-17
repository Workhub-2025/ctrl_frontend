import { describe, expect, it } from "vitest";
import { BffAuthError, handleBffRouteError } from "@/lib/auth/bff-route-errors";

describe("handleBffRouteError", () => {
  it("maps BffAuthError to the configured status", async () => {
    const response = handleBffRouteError(new BffAuthError("Authentication required", 401));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Authentication required" });
  });

  it("maps generic auth messages to 401/403", async () => {
    const forbidden = handleBffRouteError(new Error("client access required"));
    expect(forbidden.status).toBe(403);

    const unauthorized = handleBffRouteError(new Error("Authentication required"));
    expect(unauthorized.status).toBe(401);
  });

  it("defaults unknown errors to 500", () => {
    const response = handleBffRouteError(new Error("boom"));
    expect(response.status).toBe(500);
  });
});
