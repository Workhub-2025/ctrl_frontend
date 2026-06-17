import { upstashLpush } from "@/lib/security/upstash-rest";

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

  void upstashLpush(AUDIT_REDIS_KEY, JSON.stringify(payload)).catch(() => undefined);
};
