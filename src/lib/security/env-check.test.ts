import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isUpstashConfigured: vi.fn(),
  getUkComplianceConfigurationIssues: vi.fn(),
}));

vi.mock("@/lib/security/upstash-rest", () => ({
  isUpstashConfigured: mocks.isUpstashConfigured,
}));
vi.mock("@/lib/legal/uk-compliance", () => ({
  getUkComplianceConfigurationIssues:
    mocks.getUkComplianceConfigurationIssues,
}));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXTAUTH_SECRET", "test-secret");
  vi.stubEnv("ALLOW_IN_MEMORY_SECURITY", "");
  vi.stubEnv("ALLOW_INCOMPLETE_UK_COMPLIANCE", "");
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "test-api-key");
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "test.firebaseapp.com");
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "test-project");
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "test.appspot.com");
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "123456789");
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_ID", "test-app-id");
  vi.stubEnv("FIREBASE_DOMAIN_API_URL", "https://example.test");
  vi.stubEnv("GOOGLE_WORKLOAD_IDENTITY_PROVIDER", "test-provider");
  vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "test@example.test");
  mocks.isUpstashConfigured.mockReturnValue(true);
  mocks.getUkComplianceConfigurationIssues.mockReturnValue([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function runCheck() {
  const { warnIfProductionSecurityGaps } = await import("./env-check");
  return warnIfProductionSecurityGaps();
}

describe("production environment fail-closed checks", () => {
  it("rejects production without distributed security storage", async () => {
    mocks.isUpstashConfigured.mockReturnValue(false);
    await expect(runCheck()).rejects.toThrow("UPSTASH_REDIS_REST_URL/TOKEN");
  });

  it("continues validating secrets when the staging memory override is set", async () => {
    mocks.isUpstashConfigured.mockReturnValue(false);
    vi.stubEnv("ALLOW_IN_MEMORY_SECURITY", "true");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(runCheck()).rejects.toThrow("NEXTAUTH_SECRET");
  });

  it("rejects incomplete production legal configuration", async () => {
    mocks.getUkComplianceConfigurationIssues.mockReturnValue([
      "NEXT_PUBLIC_CTRL_COMPANY_NUMBER is required",
    ]);

    await expect(runCheck()).rejects.toThrow(
      "Refusing to start an incomplete production deployment",
    );
  });

  it("rejects an incomplete Firebase production cutover", async () => {
    vi.stubEnv("FIREBASE_DOMAIN_API_URL", "");

    await expect(runCheck()).rejects.toThrow("FIREBASE_DOMAIN_API_URL");
  });

  it("allows an explicit non-live compliance preview override", async () => {
    mocks.getUkComplianceConfigurationIssues.mockReturnValue([
      "NEXT_PUBLIC_CTRL_COMPANY_NUMBER is required",
    ]);
    vi.stubEnv("ALLOW_INCOMPLETE_UK_COMPLIANCE", "true");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(runCheck()).resolves.toBeUndefined();
  });
});
