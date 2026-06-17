import { isUpstashConfigured } from "@/lib/security/upstash-rest";

let warned = false;

export function warnIfProductionSecurityGaps() {
  if (warned || process.env.NODE_ENV !== "production") {
    return;
  }

  warned = true;

  if (!isUpstashConfigured()) {
    const allowInMemory = process.env.ALLOW_IN_MEMORY_SECURITY === "true";
    const message =
      "[SECURITY] UPSTASH_REDIS_REST_URL/TOKEN not set — login lockout, rate limits, and audit persistence are per-instance only.";

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
}
