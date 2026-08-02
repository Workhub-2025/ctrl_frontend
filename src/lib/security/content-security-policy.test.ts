import { afterEach, describe, expect, it, vi } from "vitest";
import { buildContentSecurityPolicy } from "./content-security-policy";

describe("content security policy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses a per-request nonce without allowing arbitrary inline scripts", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const policy = buildContentSecurityPolicy("test-nonce");
    expect(policy).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).not.toContain("https://vercel.live");
    expect(policy).toContain("identitytoolkit.googleapis.com");
    expect(policy).toContain("*.firebaseapp.com");
  });

  it("allows the Vercel live feedback iframe on Preview only", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const policy = buildContentSecurityPolicy("preview-nonce");
    expect(policy).toContain(
      "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://*.firebaseapp.com https://*.google.com https://vercel.live",
    );
    expect(policy).toContain("https://vercel.live");
    expect(policy).toContain("wss://vercel.live");
  });

  it("always allowlists the Firebase Auth browser hosts", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const policy = buildContentSecurityPolicy("firebase-nonce");

    expect(policy).toContain("https://identitytoolkit.googleapis.com");
    expect(policy).toContain("https://securetoken.googleapis.com");
    expect(policy).toContain("https://www.googleapis.com");
    expect(policy).toContain("https://*.firebaseapp.com");
    expect(policy).toContain("https://*.google.com");
    expect(policy).toContain("https://www.gstatic.com");
    expect(policy).toContain("https://apis.google.com");
    expect(policy).not.toContain("https://vercel.live");
    expect(policy).not.toContain("*.cloudfunctions.net");
    expect(policy).not.toContain("*.firebaseio.com");
  });

  it("combines Firebase Auth and Vercel live hosts on Firebase Preview", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const policy = buildContentSecurityPolicy("preview-firebase-nonce");

    expect(policy).toContain("https://identitytoolkit.googleapis.com");
    expect(policy).toContain("https://*.firebaseapp.com");
    expect(policy).toContain("https://vercel.live");
    expect(policy).toContain("wss://vercel.live");
    expect(policy).toMatch(
      /frame-src 'self' https:\/\/js\.stripe\.com https:\/\/checkout\.stripe\.com https:\/\/\*\.firebaseapp\.com https:\/\/\*\.google\.com https:\/\/vercel\.live/,
    );
  });
});
