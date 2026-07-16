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
      return;
    }

    throw new Error(
      `${message} Set Upstash credentials or ALLOW_IN_MEMORY_SECURITY=true for non-HA staging only.`
    );
  }

  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error("[SECURITY] NEXTAUTH_SECRET is required in production.");
  }

  const complianceIssues = getUkComplianceConfigurationIssues();
  if (complianceIssues.length > 0) {
    const message = `[COMPLIANCE] Production legal configuration is incomplete: ${complianceIssues.join("; ")}.`;
    if (process.env.ALLOW_INCOMPLETE_UK_COMPLIANCE === "true") {
      console.warn(`${message} ALLOW_INCOMPLETE_UK_COMPLIANCE=true is for non-live previews only.`);
      return;
    }

    // Missing public legal metadata must remain highly visible, but it must not
    // turn every page and health endpoint into a 500. Enforce this as a release
    // readiness failure in deployment checks while keeping the running service
    // available for remediation.
    console.error(`${message} The deployment is running but is not compliance-ready.`);
  }
}
