import "server-only";

import {
  isUpstashConfigured,
  upstashDel,
  upstashGetJson,
  upstashSetJson,
} from "@/lib/security/upstash-rest";

/**
 * Distributed read cache for portal server loaders (catalogue, entitlements).
 *
 * - Production: Upstash Redis (same credentials as rate limits / lockout) for cross-instance safety on Vercel.
 * - Dev / staging without Upstash: in-memory Map fallback (per Node process), mirroring login-attempt-guard.
 *
 * Do NOT cache JWTs, session cookies, passwords, or full /users/me payloads — only normalized,
 * non-secret read models. User- or tenant-scoped keys must include an id in the key string.
 *
 * Next.js `unstable_cache` is intentionally not used here: it is per-instance and can behave
 * inconsistently across serverless workers; Upstash is the project standard for shared FE state.
 */

type MemoryEntry = { value: unknown; expiresAt: number };

const memoryStore = new Map<string, MemoryEntry>();
const inFlight = new Map<string, Promise<unknown>>();

const KEY_PREFIX = "portal:";

function namespacedKey(key: string) {
  return `${KEY_PREFIX}${key}`;
}

function readMemory<T>(key: string): T | null {
  const entry = memoryStore.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value as T;
}

function writeMemory(key: string, value: unknown, ttlMs: number) {
  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export async function portalServerCacheGetOrSet<T>(
  key: string,
  ttlMs: number,
  factory: () => Promise<T>,
): Promise<T> {
  const redisKey = namespacedKey(key);

  if (isUpstashConfigured()) {
    const cached = await upstashGetJson<T>(redisKey);
    if (cached !== null) {
      return cached;
    }
  } else {
    const cached = readMemory<T>(redisKey);
    if (cached !== null) {
      return cached;
    }
  }

  const pending = inFlight.get(redisKey);
  if (pending) {
    return pending as Promise<T>;
  }

  const loadPromise = (async () => {
    try {
      const value = await factory();

      if (isUpstashConfigured()) {
        await upstashSetJson(redisKey, value, ttlMs);
      } else {
        writeMemory(redisKey, value, ttlMs);
      }

      return value;
    } finally {
      inFlight.delete(redisKey);
    }
  })();

  inFlight.set(redisKey, loadPromise);
  return loadPromise;
}

export async function portalServerCacheDel(key: string): Promise<void> {
  const redisKey = namespacedKey(key);
  inFlight.delete(redisKey);
  memoryStore.delete(redisKey);

  if (isUpstashConfigured()) {
    await upstashDel(redisKey);
  }
}

export async function portalServerCacheDelMany(keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => portalServerCacheDel(key)));
}
