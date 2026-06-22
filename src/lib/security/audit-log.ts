import {
  upstashLpush,
  upstashLtrim,
  upstashPexpire,
} from "@/lib/security/upstash-rest";

type AuthAuditEvent =
  | "login_attempt"
  | "login_success"
  | "login_failure"
  | "login_locked"
  | "logout"
  | "register_attempt"
  | "register_success"
  | "register_failure"
  | "password_reset_request"
  | "password_reset_success"
  | "password_reset_failure"
  | "authorization_denied";

type AuditMetadata = Record<string, string | number | boolean | undefined | null>;

const AUDIT_PREFIX = "[SECURITY_AUDIT]";
const AUDIT_REDIS_KEY = "security:audit:events";
/** Cap persisted audit events (newest-first list after LPUSH). */
const AUDIT_MAX_EVENTS = 5_000;
/** Rolling retention for the audit list key. */
const AUDIT_TTL_MS = 30 * 24 * 60 * 60_000;

async function persistAuditEvent(serialized: string) {
  const pushed = await upstashLpush(AUDIT_REDIS_KEY, serialized);
  if (!pushed) return;

  await Promise.all([
    upstashLtrim(AUDIT_REDIS_KEY, 0, AUDIT_MAX_EVENTS - 1),
    upstashPexpire(AUDIT_REDIS_KEY, AUDIT_TTL_MS),
  ]);
}

/**
 * Structured auth audit logger. Always logs to stdout; optionally persists to Upstash.
 */
export const logAuthAuditEvent = (
  event: AuthAuditEvent,
  metadata: AuditMetadata = {}
) => {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  try {
    console.info(AUDIT_PREFIX, JSON.stringify(payload));
  } catch {
    console.info(AUDIT_PREFIX, payload);
  }

  void persistAuditEvent(JSON.stringify(payload)).catch(() => undefined);
};
