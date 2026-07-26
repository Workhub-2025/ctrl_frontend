import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: { email: "admin@example.com" } as Record<string, unknown>,
  enroll: vi.fn(),
  getSession: vi.fn(),
  unenroll: vi.fn(),
  signOut: vi.fn(),
  generateSecret: vi.fn(),
  assertionForEnrollment: vi.fn(),
}));

vi.mock("@/lib/firebase-client", () => ({
  getFirebaseBrowserAuth: () => ({ currentUser: mocks.currentUser }),
}));

vi.mock("firebase/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/auth")>();
  return {
    ...actual,
    multiFactor: () => ({
      enrolledFactors: [],
      enroll: mocks.enroll,
      getSession: mocks.getSession,
      unenroll: mocks.unenroll,
    }),
    signOut: mocks.signOut,
    TotpMultiFactorGenerator: {
      FACTOR_ID: "totp",
      generateSecret: mocks.generateSecret,
      assertionForEnrollment: mocks.assertionForEnrollment,
    },
  };
});

import {
  beginFirebaseTotpEnrollment,
  completeFirebaseTotpEnrollment,
} from "@/lib/firebase-totp-browser";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ session: true });
  mocks.generateSecret.mockResolvedValue({
    secretKey: "SECRET",
    generateQrCodeUrl: () => "otpauth://totp/CTRL",
  });
  mocks.assertionForEnrollment.mockReturnValue({ assertion: true });
});

describe("Firebase TOTP enrollment", () => {
  it("creates an authenticator secret from a Firebase MFA session", async () => {
    await expect(beginFirebaseTotpEnrollment()).resolves.toEqual({
      secretKey: "SECRET",
      authenticatorUri: "otpauth://totp/CTRL",
    });
    expect(mocks.getSession).toHaveBeenCalledOnce();
  });

  it("enrols the assertion then requires a fresh MFA sign-in", async () => {
    await beginFirebaseTotpEnrollment();
    await expect(completeFirebaseTotpEnrollment("123456")).resolves.toEqual({
      requiresFreshMfaSignIn: true,
    });
    expect(mocks.enroll).toHaveBeenCalledWith(
      { assertion: true },
      "Authenticator app",
    );
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });
});

