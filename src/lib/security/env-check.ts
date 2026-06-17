import { isUpstashConfigured } from "@/lib/security/upstash-rest";

let warned = false;

export function warnIfProductionSecurityGaps() {
  if (warned || process.env.NODE_ENV !== "production") {
    return;
  }

  warned = true;

  if (!isUpstashConfigured()) {
    console.warn(
      "[SECURITY] UPSTASH_REDIS_REST_URL/TOKEN not set — login lockout, rate limits, and audit persistence are per-instance only."
    );
  }

  if (!process.env.NEXTAUTH_SECRET) {
    console.warn("[SECURITY] NEXTAUTH_SECRET is missing.");
  }
}
