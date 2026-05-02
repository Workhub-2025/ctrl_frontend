type AuthAuditEvent =
  | "login_attempt"
  | "login_success"
  | "login_failure"
  | "login_locked"
  | "authorization_denied";

type AuditMetadata = Record<string, string | number | boolean | undefined | null>;

const AUDIT_PREFIX = "[SECURITY_AUDIT]";

/**
 * Lightweight audit logger scaffold for security-sensitive authentication events.
 * This intentionally logs structured JSON so it can be forwarded to a SIEM later.
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
    // Fallback for unexpected serialization edge-cases.
    console.info(AUDIT_PREFIX, payload);
  }
};
