interface RateLimitState {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  backend: "memory" | "upstash";
}

const buckets = new Map<string, RateLimitState>();
const MAX_MEMORY_BUCKETS = 10_000;

const toSeconds = (ms: number) => Math.max(1, Math.ceil(ms / 1000));
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/** Keep Preview rehearsal buckets from colliding with production counters. */
function rateLimitEnvPrefix(): string {
  return process.env.VERCEL_ENV || process.env.NODE_ENV || "local";
}

function scopedRateLimitKey(key: string): string {
  return `${rateLimitEnvPrefix()}:${key}`;
}

/**
 * Invitation / Firebase account provisioning is abuse-sensitive but also easy
 * to burn through during Preview rehearsal (retries, shared NAT, failed
 * backend round-trips). Production stays tight; Preview is loftier.
 */
export function accountProvisioningRateLimit(): {
  limit: number;
  windowMs: number;
} {
  const windowMs = 60 * 60 * 1_000;
  if (process.env.VERCEL_ENV === "preview") {
    return { limit: 30, windowMs };
  }
  return { limit: 10, windowMs };
}

export const extractClientIp = (request: Request): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
};

const applyMemoryRateLimit = ({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult => {
  const now = Date.now();

  // Prevent unbounded memory growth when the distributed backend is unavailable.
  if (buckets.size >= MAX_MEMORY_BUCKETS) {
    for (const [bucketKey, state] of buckets) {
      if (state.resetAt <= now) buckets.delete(bucketKey);
    }
    if (buckets.size >= MAX_MEMORY_BUCKETS) {
      const oldestKey = buckets.keys().next().value as string | undefined;
      if (oldestKey) buckets.delete(oldestKey);
    }
  }

  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: toSeconds(windowMs),
      backend: "memory",
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterSeconds: toSeconds(current.resetAt - now),
      backend: "memory",
    };
  }

  current.count += 1;
  buckets.set(key, current);

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - current.count),
    retryAfterSeconds: toSeconds(current.resetAt - now),
    backend: "memory",
  };
};

const applyUpstashRateLimit = async ({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> => {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return applyMemoryRateLimit({ key, limit, windowMs });
  }

  const redisKey = `rate:${key}`;
  const baseHeaders = {
    Authorization: `Bearer ${UPSTASH_TOKEN}`,
    "Content-Type": "application/json",
  };

  try {
    const incrResponse = await fetch(`${UPSTASH_URL}/incr/${encodeURIComponent(redisKey)}`, {
      method: "POST",
      headers: baseHeaders,
      signal: AbortSignal.timeout(3_000),
    });
    const incrJson = (await incrResponse.json()) as { result?: number };
    const count = Number(incrJson.result ?? 0);

    if (!Number.isFinite(count) || count <= 0) {
      throw new Error("Invalid INCR response");
    }

    if (count === 1) {
      await fetch(
        `${UPSTASH_URL}/pexpire/${encodeURIComponent(redisKey)}/${windowMs}`,
        {
          method: "POST",
          headers: baseHeaders,
          signal: AbortSignal.timeout(3_000),
        }
      );
    }

    const ttlResponse = await fetch(`${UPSTASH_URL}/pttl/${encodeURIComponent(redisKey)}`, {
      method: "POST",
      headers: baseHeaders,
      signal: AbortSignal.timeout(3_000),
    });
    const ttlJson = (await ttlResponse.json()) as { result?: number };
    const ttlMs =
      typeof ttlJson.result === "number" && ttlJson.result > 0
        ? ttlJson.result
        : windowMs;

    if (count > limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        retryAfterSeconds: toSeconds(ttlMs),
        backend: "upstash",
      };
    }

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: toSeconds(ttlMs),
      backend: "upstash",
    };
  } catch {
    // Resilient fallback for local/dev or transient Redis issues.
    return applyMemoryRateLimit({ key, limit, windowMs });
  }
};

export const applyRateLimit = async ({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> =>
  applyUpstashRateLimit({
    key: scopedRateLimitKey(key),
    limit,
    windowMs,
  });

/**
 * Shared mutation limiter for BFF routes. Use the authenticated user id when it
 * is already available so colleagues on one corporate network do not share a bucket.
 */
export async function rejectRateLimitedMutation(
  request: Request,
  {
    scope,
    actorId,
    limit = 60,
    windowMs = 60_000,
  }: { scope: string; actorId?: string | number | null; limit?: number; windowMs?: number },
) {
  const identity = actorId ? `user:${String(actorId)}` : `ip:${extractClientIp(request)}`;
  const result = await applyRateLimit({
    key: `mutation:${scope}:${identity}`,
    limit,
    windowMs,
  });

  if (result.allowed) return null;

  const { NextResponse } = await import("next/server");
  return NextResponse.json(
    { error: "Too many requests. Please wait and try again." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
