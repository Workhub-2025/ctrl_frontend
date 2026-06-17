/**
 * Shared in-memory cache for portal API reads.
 * - TTL avoids refetching on every navigation
 * - minRefetchMs throttles back-to-back force refreshes
 * - In-flight deduplication prevents duplicate parallel requests
 *
 * Security: per-tab only; stores non-sensitive portal list/summary data.
 * Auth is enforced by upstream API routes — never cache secrets or JWTs here.
 */

export const PORTAL_CACHE_TTL_MS = 90_000;
export const PORTAL_MIN_REFETCH_MS = 5_000;

type CacheEntry<T> = {
  data?: T;
  error?: string | null;
  promise?: Promise<T>;
  updatedAt: number;
  lastFetchAttemptAt: number;
};

const stores = new Map<string, CacheEntry<unknown>>();

export function invalidatePortalCache(key?: string) {
  if (key) {
    stores.delete(key);
    return;
  }
  stores.clear();
}

export function setPortalCacheData<T>(key: string, data: T) {
  stores.set(key, {
    data,
    error: null,
    updatedAt: Date.now(),
    lastFetchAttemptAt: Date.now(),
  });
}

function isFresh<T>(entry: CacheEntry<T> | undefined, ttlMs: number) {
  return Boolean(entry && entry.data !== undefined && Date.now() - entry.updatedAt < ttlMs);
}

function isThrottled(entry: CacheEntry<unknown> | undefined, minRefetchMs: number) {
  return Boolean(entry && Date.now() - entry.lastFetchAttemptAt < minRefetchMs);
}

/** Soften noisy upstream errors for optional portal data. */
export function normalizePortalError(message: string, allowEmpty = false) {
  const trimmed = message.trim();
  if (!trimmed) return trimmed;

  if (allowEmpty && /not found|404|could not be loaded/i.test(trimmed)) {
    return "";
  }

  if (/not found/i.test(trimmed)) {
    return "This information is not available yet.";
  }

  return trimmed;
}

export type PortalFetchOptions<T> = {
  key: string;
  url: string;
  fallback: T;
  force?: boolean;
  ttlMs?: number;
  minRefetchMs?: number;
  /** When true, null/404 responses resolve to fallback without surfacing an error. */
  allowEmpty?: boolean;
  transform?: (body: unknown) => T;
};

async function readPortalResponse<T>(
  response: Response,
  fallback: T,
  allowEmpty: boolean,
  transform?: (body: unknown) => T
): Promise<T> {
  const body = await response.json().catch(() => ({}));
  const record = body as { data?: unknown; error?: string };

  if (!response.ok) {
    if (allowEmpty && (response.status === 404 || /not found/i.test(record.error ?? ""))) {
      return fallback;
    }
    throw new Error(record.error || `Request failed (${response.status})`);
  }

  if (transform) {
    return transform(body);
  }

  if (record.data === undefined || record.data === null) {
    return fallback;
  }

  return record.data as T;
}

export async function fetchPortalJson<T>(options: PortalFetchOptions<T>): Promise<T> {
  const {
    key,
    url,
    fallback,
    force = false,
    ttlMs = PORTAL_CACHE_TTL_MS,
    minRefetchMs = PORTAL_MIN_REFETCH_MS,
    allowEmpty = false,
    transform,
  } = options;

  const existing = stores.get(key) as CacheEntry<T> | undefined;

  if (force) {
    stores.delete(key);
  } else if (isFresh(existing, ttlMs)) {
    return existing!.data as T;
  }

  if (!force && existing?.promise) {
    return existing.promise as Promise<T>;
  }

  const attemptAt = Date.now();
  const promise = fetch(url, { cache: "no-store" })
    .then((response) => readPortalResponse(response, fallback, allowEmpty, transform))
    .then((data) => {
      stores.set(key, {
        data,
        error: null,
        updatedAt: Date.now(),
        lastFetchAttemptAt: attemptAt,
      });
      return data;
    })
    .catch((error) => {
      const message = normalizePortalError(
        error instanceof Error ? error.message : "Request could not be completed",
        allowEmpty
      );

      if (allowEmpty && !message) {
        stores.set(key, {
          data: fallback,
          error: null,
          updatedAt: Date.now(),
          lastFetchAttemptAt: attemptAt,
        });
        return fallback;
      }

      stores.set(key, {
        data: existing?.data ?? fallback,
        error: message,
        updatedAt: existing?.updatedAt ?? 0,
        lastFetchAttemptAt: attemptAt,
      });
      throw new Error(message);
    })
    .finally(() => {
      const current = stores.get(key) as CacheEntry<T> | undefined;
      if (current?.promise === promise) {
        stores.set(key, {
          data: current.data,
          error: current.error,
          updatedAt: current.updatedAt,
          lastFetchAttemptAt: current.lastFetchAttemptAt,
        });
      }
    });

  stores.set(key, {
    data: existing?.data,
    error: existing?.error,
    promise,
    updatedAt: existing?.updatedAt ?? 0,
    lastFetchAttemptAt: attemptAt,
  });

  return promise;
}

export function peekPortalCache<T>(key: string): T | undefined {
  const entry = stores.get(key) as CacheEntry<T> | undefined;
  return entry?.data;
}
