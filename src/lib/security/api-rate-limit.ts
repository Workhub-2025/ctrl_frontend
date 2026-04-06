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

const toSeconds = (ms: number) => Math.max(1, Math.ceil(ms / 1000));
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

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
        }
      );
    }

    const ttlResponse = await fetch(`${UPSTASH_URL}/pttl/${encodeURIComponent(redisKey)}`, {
      method: "POST",
      headers: baseHeaders,
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
}): Promise<RateLimitResult> => applyUpstashRateLimit({ key, limit, windowMs });
