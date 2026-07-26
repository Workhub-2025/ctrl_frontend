import { describe, expect, it, vi } from "vitest";
import { createCloudRunBffClient } from "@/lib/cloud-run-bff-client";
import {
  FIREBASE_SESSION_COOKIE_POLICY,
  isRecentFirebaseAuthentication,
} from "@/lib/firebase-session-contracts";
import { toPublicFirebaseSessionExchangeResponse } from "@/lib/firebase-session-server";
import { isValidFirebaseSessionCsrfToken } from "@/lib/firebase-session-server";

describe("Cloud Run BFF client", () => {
  it("uses short-lived caller credentials without service-account material", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const getIdentityToken = vi.fn(async () => "short-lived-oidc-token");
    const client = createCloudRunBffClient({
      baseUrl: "https://domain-api.example.run.app",
      getIdentityToken,
      fetchImpl,
    });

    await expect(
      client.request<{ ok: boolean }>({
        path: "/v1/screens/candidate-dashboard",
        firebaseSessionCookie: "opaque-session-cookie",
      }),
    ).resolves.toEqual({ ok: true });

    expect(getIdentityToken).toHaveBeenCalledWith(
      "https://domain-api.example.run.app",
    );
    const init = fetchImpl.mock.calls[0]?.[1];
    if (!init) throw new Error("Expected a fetch request");
    expect(init.cache).toBe("no-store");
    expect(init.headers).toMatchObject({
      authorization: "Bearer short-lived-oidc-token",
      "x-ctrl-firebase-session": "opaque-session-cookie",
    });
    expect(JSON.stringify(init)).not.toMatch(/private_key|client_email/);
  });

  it("defines a secure cookie and recent-authentication boundary", () => {
    expect(FIREBASE_SESSION_COOKIE_POLICY).toMatchObject({
      name: "__Host-ctrl_session",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
    expect(isRecentFirebaseAuthentication(900, 1_000)).toBe(true);
    expect(isRecentFirebaseAuthentication(600, 1_000)).toBe(false);
    expect(isRecentFirebaseAuthentication(1_001, 1_000)).toBe(false);
  });

  it("rejects attempts to replace trusted transport headers", async () => {
    const client = createCloudRunBffClient({
      baseUrl: "https://domain-api.example.run.app",
      getIdentityToken: async () => "trusted-token",
      fetchImpl: vi.fn(),
    });

    await expect(
      client.request({
        path: "/v1/screens/admin",
        firebaseSessionCookie: "trusted-session",
        headers: { Authorization: "Bearer attacker-controlled" },
      }),
    ).rejects.toThrow("cannot override reserved header");
  });

  it("allows only the session bootstrap operation to omit a Firebase session", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (_input, _init) =>
      Promise.resolve(new Response(
        JSON.stringify({
          sessionCookie: "new-session",
          expiresInMilliseconds: 43_200_000,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )),
    );
    const client = createCloudRunBffClient({
      baseUrl: "https://domain-api.example.run.app",
      getIdentityToken: async () => "short-lived-google-id-token",
      fetchImpl,
    });

    await client.request({
      path: "/v1/auth/session-exchange",
      method: "POST",
      body: { idToken: "firebase-id-token" },
    });

    const headers = fetchImpl.mock.calls[0]?.[1]?.headers;
    expect(headers).toMatchObject({
      authorization: "Bearer short-lived-google-id-token",
    });
    expect(headers).not.toHaveProperty("x-ctrl-firebase-session");
  });

  it("never serializes the trusted session cookie to browser JSON", () => {
    const publicResponse = toPublicFirebaseSessionExchangeResponse({
      sessionCookie: "opaque-secret-cookie",
      expiresAt: "2026-07-24T00:00:00.000Z",
      user: { userId: "user-1", portalRole: "admin" },
    });

    expect(publicResponse).toEqual({
      expiresAt: "2026-07-24T00:00:00.000Z",
      user: { userId: "user-1", portalRole: "admin" },
    });
    expect(JSON.stringify(publicResponse)).not.toContain("opaque-secret-cookie");
    expect(publicResponse).not.toHaveProperty("sessionCookie");
  });

  it("compares the one-use session CSRF value exactly", () => {
    const token = "a".repeat(43);
    expect(isValidFirebaseSessionCsrfToken(token, token)).toBe(true);
    expect(isValidFirebaseSessionCsrfToken(token, `${token}x`)).toBe(false);
    expect(isValidFirebaseSessionCsrfToken("short", "short")).toBe(false);
  });
});
