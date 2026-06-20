import { AuthAPI } from "@/services/auth-api";
import { inferDevSeededRole, normalizeRole } from "@/lib/auth/role-model";
import { logAuthAuditEvent } from "@/lib/security/audit-log";
import { applyRateLimit } from "@/lib/security/api-rate-limit";
import {
  buildLoginAttemptKey,
  checkLoginAttemptAllowed,
  clearLoginAttempts,
  recordFailedLoginAttempt,
} from "@/lib/security/login-attempt-guard";
import type { getAuthRequestContext } from "@/lib/auth/session-config";

const LOGIN_RATE_LIMIT = 20;
const LOGIN_RATE_WINDOW_MS = 60_000;
const REGISTER_RATE_LIMIT = 10;
const REGISTER_RATE_WINDOW_MS = 60_000;

export type AuthContext = ReturnType<typeof getAuthRequestContext>;

export type CredentialAuthResult = {
  authResponse: Awaited<ReturnType<typeof AuthAPI.login>>;
  role: string;
};

export class CredentialAuthError extends Error {
  code: "LOCKED" | "INVALID" | "RATE_LIMITED";
  retryAfterSeconds?: number;

  constructor(
    code: CredentialAuthError["code"],
    message: string,
    retryAfterSeconds?: number
  ) {
    super(message);
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function authenticateCredentials(params: {
  email: string;
  password: string;
  context: AuthContext;
}): Promise<CredentialAuthResult> {
  const email = params.email.trim().toLowerCase();
  const { ipAddress, userAgent } = params.context;

  const rateLimit = await applyRateLimit({
    key: `auth:login:${ipAddress}`,
    limit: LOGIN_RATE_LIMIT,
    windowMs: LOGIN_RATE_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    logAuthAuditEvent("login_failure", {
      email,
      ipAddress,
      userAgent,
      reason: "rate_limited",
    });
    throw new CredentialAuthError(
      "RATE_LIMITED",
      "Too many requests. Please try again later.",
      rateLimit.retryAfterSeconds
    );
  }

  const attemptKey = buildLoginAttemptKey(email, ipAddress);
  const attemptGuard = await checkLoginAttemptAllowed(attemptKey);

  if (!attemptGuard.allowed) {
    logAuthAuditEvent("login_locked", {
      email,
      ipAddress,
      userAgent,
      retryAfterSeconds: attemptGuard.retryAfterSeconds,
    });
    throw new CredentialAuthError(
      "LOCKED",
      "Too many login attempts. Please try again later.",
      attemptGuard.retryAfterSeconds
    );
  }

  logAuthAuditEvent("login_attempt", {
    email,
    ipAddress,
    userAgent,
    remainingAttempts: attemptGuard.remainingAttempts,
  });

  try {
    const authResponse = await AuthAPI.login({
      identifier: email,
      password: params.password,
    });

    if (!authResponse.jwt || !authResponse.user) {
      throw new Error("Invalid Strapi auth response");
    }

    await clearLoginAttempts(attemptKey);

    const userRole = authResponse.user.role;
    const fallbackDevRole = inferDevSeededRole(authResponse.user.email || email);
    const role = userRole ? normalizeRole(userRole) : fallbackDevRole ?? "candidate";

    logAuthAuditEvent("login_success", {
      email,
      ipAddress,
      userAgent,
      role,
      userId: authResponse.user.id,
    });

    return { authResponse, role };
  } catch (error) {
    const message = error instanceof Error ? error.message.trim() : "";
    const isStrapiRejection =
      message.length > 0 &&
      message !== "Invalid Strapi auth response" &&
      message !== "Login failed" &&
      message !== "Request timeout" &&
      message !== "Request failed";

    if (message === "Request timeout") {
      logAuthAuditEvent("login_failure", {
        email,
        ipAddress,
        userAgent,
        reason: "strapi_timeout",
      });
      throw new CredentialAuthError(
        "INVALID",
        "Authentication service timed out. Check STRAPI_API_URL is reachable from the server."
      );
    }

    if (isStrapiRejection) {
      logAuthAuditEvent("login_failure", {
        email,
        ipAddress,
        userAgent,
        reason: message,
      });
      throw new CredentialAuthError("INVALID", message);
    }

    const failedAttempt = await recordFailedLoginAttempt(attemptKey);

    logAuthAuditEvent("login_failure", {
      email,
      ipAddress,
      userAgent,
      reason: "Invalid credentials",
      failures: failedAttempt.failures,
      remainingAttempts: failedAttempt.remainingAttempts,
    });

    if (failedAttempt.lockedUntil) {
      logAuthAuditEvent("login_locked", {
        email,
        ipAddress,
        userAgent,
        retryAfterSeconds: Math.ceil((failedAttempt.lockedUntil - Date.now()) / 1000),
      });
      throw new CredentialAuthError(
        "LOCKED",
        "Too many login attempts. Please try again later.",
        Math.ceil((failedAttempt.lockedUntil - Date.now()) / 1000)
      );
    }

    throw new CredentialAuthError("INVALID", "Credentials not verified");
  }
}

export async function enforceRegisterRateLimit(context: AuthContext) {
  const rateLimit = await applyRateLimit({
    key: `auth:register:${context.ipAddress}`,
    limit: REGISTER_RATE_LIMIT,
    windowMs: REGISTER_RATE_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    throw new CredentialAuthError(
      "RATE_LIMITED",
      "Too many registration attempts. Please try again later.",
      rateLimit.retryAfterSeconds
    );
  }
}
