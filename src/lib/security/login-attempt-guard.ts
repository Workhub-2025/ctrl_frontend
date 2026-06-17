import {
  upstashDel,
  upstashGetJson,
  upstashSetJson,
} from "@/lib/security/upstash-rest";

const ATTEMPT_WINDOW_MS =
  Number.parseInt(process.env.AUTH_ATTEMPT_WINDOW_MS || "", 10) ||
  10 * 60 * 1000;
const LOCKOUT_WINDOW_MS =
  Number.parseInt(process.env.AUTH_LOCKOUT_WINDOW_MS || "", 10) ||
  15 * 60 * 1000;
const MAX_ATTEMPTS =
  Number.parseInt(process.env.AUTH_MAX_ATTEMPTS || "", 10) || 5;

interface LoginAttemptState {
  failures: number;
  firstFailureAt: number;
  blockedUntil?: number;
}

const attempts = new Map<string, LoginAttemptState>();

const redisKey = (key: string) => `auth:attempt:${key}`;

const isWindowExpired = (state: LoginAttemptState, now: number) =>
  now - state.firstFailureAt > ATTEMPT_WINDOW_MS;

const toSeconds = (ms: number) => Math.max(1, Math.ceil(ms / 1000));

export const buildLoginAttemptKey = (email: string, ipAddress: string) =>
  `${email.trim().toLowerCase()}::${ipAddress.trim().toLowerCase() || "unknown"}`;

const readState = async (key: string): Promise<LoginAttemptState | null> => {
  const fromRedis = await upstashGetJson<LoginAttemptState>(redisKey(key));
  if (fromRedis) {
    return fromRedis;
  }
  return attempts.get(key) ?? null;
};

const writeState = async (key: string, state: LoginAttemptState) => {
  const ttlMs = state.blockedUntil
    ? Math.max(LOCKOUT_WINDOW_MS, state.blockedUntil - Date.now())
    : ATTEMPT_WINDOW_MS;

  const persisted = await upstashSetJson(redisKey(key), state, ttlMs);
  if (!persisted) {
    attempts.set(key, state);
  }
};

const deleteState = async (key: string) => {
  attempts.delete(key);
  await upstashDel(redisKey(key));
};

export const checkLoginAttemptAllowed = async (key: string) => {
  const now = Date.now();
  const state = await readState(key);

  if (!state) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  if (isWindowExpired(state, now)) {
    await deleteState(key);
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

export const recordFailedLoginAttempt = async (key: string) => {
  const now = Date.now();
  const existing = await readState(key);

  if (!existing || isWindowExpired(existing, now)) {
    const next: LoginAttemptState = { failures: 1, firstFailureAt: now };
    await writeState(key, next);
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
  await writeState(key, next);

  return {
    failures,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - failures),
    lockedUntil: next.blockedUntil,
  };
};

export const clearLoginAttempts = async (key: string) => {
  await deleteState(key);
};
