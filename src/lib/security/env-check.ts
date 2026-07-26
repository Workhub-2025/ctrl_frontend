import { isUpstashConfigured } from "@/lib/security/upstash-rest";
import { getUkComplianceConfigurationIssues } from "@/lib/legal/uk-compliance";

let warned = false;

export function warnIfProductionSecurityGaps() {
  if (warned || process.env.NODE_ENV !== "production") {
    return;
  }

  warned = true;

  if (!isUpstashConfigured()) {
    const allowInMemory = process.env.ALLOW_IN_MEMORY_SECURITY === "true";
    const message =
      "[SECURITY] UPSTASH_REDIS_REST_URL/TOKEN not set — login lockout, rate limits, audit persistence, and portal server read cache are per-instance only.";

    if (allowInMemory) {
      console.warn(`${message} ALLOW_IN_MEMORY_SECURITY=true — not recommended for production.`);
    } else {
      throw new Error(
        `${message} Set Upstash credentials or ALLOW_IN_MEMORY_SECURITY=true for non-HA staging only.`
      );
    }
  }

  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error("[SECURITY] NEXTAUTH_SECRET is required in production.");
  }

  if (process.env.NEXT_PUBLIC_AUTH_PROVIDER === "firebase") {
    const requiredFirebaseVariables = [
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
      "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
      "NEXT_PUBLIC_FIREBASE_APP_ID",
      "FIREBASE_DOMAIN_API_URL",
      "GOOGLE_WORKLOAD_IDENTITY_PROVIDER",
      "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    ].filter((name) => !process.env[name]?.trim());

    if (requiredFirebaseVariables.length > 0) {
      throw new Error(
        `[SECURITY] Firebase authentication is enabled but required configuration is missing: ${requiredFirebaseVariables.join(", ")}.`,
      );
    }
  }

  const complianceIssues = getUkComplianceConfigurationIssues();
  if (complianceIssues.length > 0) {
    const message = `[COMPLIANCE] Production legal configuration is incomplete: ${complianceIssues.join("; ")}.`;
    if (process.env.ALLOW_INCOMPLETE_UK_COMPLIANCE === "true") {
      console.warn(`${message} ALLOW_INCOMPLETE_UK_COMPLIANCE=true is for non-live previews only.`);
      return;
    }

    throw new Error(`${message} Refusing to start an incomplete production deployment.`);
  }
}
