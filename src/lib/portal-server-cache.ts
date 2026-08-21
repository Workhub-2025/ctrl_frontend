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
 * Two tiers:
 * - In-process Map: warm Vercel isolates skip Upstash entirely on the next hit.
 * - Upstash Redis (same credentials as rate limits / lockout) for cross-instance
 *   sharing. Values are written as Redis SET bodies, not URL path segments.
 *
 * Dev without Upstash uses the in-memory Map only.
 *
 * Do NOT cache JWTs, session cookies, passwords, or full /users/me payloads — only
 * normalized, non-secret read models. User- or tenant-scoped keys must include an
 * id in the key string.
 *
 * Next.js `unstable_cache` is intentionally not used here: it is per-instance and
 * can behave inconsistently across serverless workers; Upstash is the project
 * standard for shared FE state.
 */

type MemoryEntry = { value: unknown; expiresAt: number };

const memoryStore = new Map<string, MemoryEntry>();
const inFlight = new Map<string, Promise<unknown>>();

const KEY_PREFIX = "portal:";
const MAX_MEMORY_ENTRIES = 200;

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

function evictMemoryIfNeeded() {
  if (memoryStore.size < MAX_MEMORY_ENTRIES) {
    return;
  }
  const now = Date.now();
  for (const [entryKey, entry] of memoryStore) {
    if (entry.expiresAt <= now) {
      memoryStore.delete(entryKey);
    }
  }
  while (memoryStore.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = memoryStore.keys().next().value as string | undefined;
    if (!oldestKey) {
      break;
    }
    memoryStore.delete(oldestKey);
  }
}

function writeMemory(key: string, value: unknown, ttlMs: number) {
  evictMemoryIfNeeded();
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

  const memoryHit = readMemory<T>(redisKey);
  if (memoryHit !== null) {
    return memoryHit;
  }

  const pending = inFlight.get(redisKey);
  if (pending) {
    return pending as Promise<T>;
  }

  const loadPromise = (async () => {
    try {
      if (isUpstashConfigured()) {
        const cached = await upstashGetJson<T>(redisKey);
        if (cached !== null) {
          writeMemory(redisKey, cached, ttlMs);
          return cached;
        }
      }

      const value = await factory();
      writeMemory(redisKey, value, ttlMs);
      if (isUpstashConfigured()) {
        void upstashSetJson(redisKey, value, ttlMs);
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
  await Promise.all(keys.map((entryKey) => portalServerCacheDel(entryKey)));
}
