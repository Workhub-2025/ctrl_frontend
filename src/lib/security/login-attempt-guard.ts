const ATTEMPT_WINDOW_MS =
  Number.parseInt(process.env.AUTH_ATTEMPT_WINDOW_MS || "", 10) ||
  10 * 60 * 1000; // 10 minutes
const LOCKOUT_WINDOW_MS =
  Number.parseInt(process.env.AUTH_LOCKOUT_WINDOW_MS || "", 10) ||
  15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS =
  Number.parseInt(process.env.AUTH_MAX_ATTEMPTS || "", 10) || 5;

interface LoginAttemptState {
  failures: number;
  firstFailureAt: number;
  blockedUntil?: number;
}

const attempts = new Map<string, LoginAttemptState>();

const isWindowExpired = (state: LoginAttemptState, now: number) =>
  now - state.firstFailureAt > ATTEMPT_WINDOW_MS;

const toSeconds = (ms: number) => Math.max(1, Math.ceil(ms / 1000));

export const buildLoginAttemptKey = (email: string, ipAddress: string) =>
  `${email.trim().toLowerCase()}::${ipAddress.trim().toLowerCase() || "unknown"}`;

export const checkLoginAttemptAllowed = (key: string) => {
  const now = Date.now();
  const state = attempts.get(key);

  if (!state) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  if (isWindowExpired(state, now)) {
    attempts.delete(key);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  if (state.blockedUntil && state.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: toSeconds(state.blockedUntil - now),
      remainingAttempts: 0,
    };
  }

  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - state.failures);
  return { allowed: true, remainingAttempts };
};

export const recordFailedLoginAttempt = (key: string) => {
  const now = Date.now();
  const existing = attempts.get(key);

  if (!existing || isWindowExpired(existing, now)) {
    const next: LoginAttemptState = { failures: 1, firstFailureAt: now };
    attempts.set(key, next);
    return {
      failures: next.failures,
      remainingAttempts: Math.max(0, MAX_ATTEMPTS - next.failures),
      lockedUntil: undefined as number | undefined,
    };
  }

  const failures = existing.failures + 1;
  const next: LoginAttemptState = {
    failures,
    firstFailureAt: existing.firstFailureAt,
    blockedUntil:
      failures >= MAX_ATTEMPTS ? now + LOCKOUT_WINDOW_MS : existing.blockedUntil,
  };
  attempts.set(key, next);

  return {
    failures,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - failures),
    lockedUntil: next.blockedUntil,
  };
};

export const clearLoginAttempts = (key: string) => {
  attempts.delete(key);
};

