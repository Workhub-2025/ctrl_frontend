import { describe, expect, it, vi } from "vitest";

import { exchangeFirebaseIdTokenForSession } from "@/lib/firebase-auth-browser";

describe("Firebase browser session bootstrap", () => {
  it("uses a short-lived CSRF challenge and does not return either token", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: "csrf-token-value" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              expiresAt: "2026-07-24T00:00:00.000Z",
              user: { userId: "user-1", portalRole: "candidate" },
              redirectPath: "/candidate-dashboard/",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    const result = await exchangeFirebaseIdTokenForSession(
      "firebase-browser-id-token",
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "/api/auth/firebase/csrf",
      expect.objectContaining({ credentials: "same-origin", cache: "no-store" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "/api/auth/firebase/session",
      expect.objectContaining({
        credentials: "same-origin",
        body: JSON.stringify({
          idToken: "firebase-browser-id-token",
          csrfToken: "csrf-token-value",
        }),
      }),
    );
    expect(result).not.toHaveProperty("provisioningRequired");
    if ("provisioningRequired" in result && result.provisioningRequired) {
      throw new Error("Expected a provisioned user session");
    }
    expect(result.user).toEqual({
      userId: "user-1",
      portalRole: "candidate",
    });
    expect(JSON.stringify(result)).not.toMatch(/firebase-browser-id-token|csrf-token-value/);
  });

  it("does not attempt the session exchange when CSRF initialization fails", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: "Unavailable" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      exchangeFirebaseIdTokenForSession("firebase-browser-id-token", fetchImpl),
    ).rejects.toThrow("Unavailable");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("accepts a pre-provisioning session without exposing a fake application user", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: "csrf-token-value" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              expiresAt: "2026-07-24T00:00:00.000Z",
              provisioningRequired: true,
              bootstrapStatus: "pending",
              redirectPath: "/auth/bootstrap",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    await expect(
      exchangeFirebaseIdTokenForSession("firebase-browser-id-token", fetchImpl),
    ).resolves.toEqual({
      expiresAt: "2026-07-24T00:00:00.000Z",
      provisioningRequired: true,
      bootstrapStatus: "pending",
      redirectPath: "/auth/bootstrap",
    });
  });

  it("marks invitation activation so the BFF does not resolve /v1/me prematurely", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: "csrf-token-value" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              expiresAt: "2026-07-24T00:00:00.000Z",
              provisioningRequired: true,
              redirectPath: "/auth/accept-invitation",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    await exchangeFirebaseIdTokenForSession(
      "firebase-browser-id-token",
      fetchImpl,
      "invitation_acceptance",
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "/api/auth/firebase/session",
      expect.objectContaining({
        body: JSON.stringify({
          idToken: "firebase-browser-id-token",
          csrfToken: "csrf-token-value",
          intent: "invitation_acceptance",
        }),
      }),
    );
  });
});
