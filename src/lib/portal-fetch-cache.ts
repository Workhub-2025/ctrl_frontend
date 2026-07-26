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

function parseRetryAfterSeconds(response: Response): number | null {
  const header = response.headers.get("Retry-After");
  if (!header) return null;
  const seconds = Number.parseInt(header, 10);
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds;
  }
  const retryAt = Date.parse(header);
  if (Number.isFinite(retryAt)) {
    return Math.max(1, Math.ceil((retryAt - Date.now()) / 1000));
  }
  return null;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** True when the org is locked pending activation/payment — not a hard failure. */
export function isCommercialLockMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  return /not operational|no_active_contract|contract_not_paid|billing_past_due|billing_unpaid|organization_suspended|contract_outside_term/i.test(
    message,
  );
}

/** Soften noisy upstream errors for optional portal data. */
export function normalizePortalError(message: string, allowEmpty = false) {
  const trimmed = message.trim();
  if (!trimmed) return trimmed;

  if (allowEmpty && /not found|404|could not be loaded/i.test(trimmed)) {
    return "";
  }

  // Unpaid / inactive contracts block operational APIs by design — callers
  // should show a payment CTA instead of a hard error banner.
  if (allowEmpty && isCommercialLockMessage(trimmed)) {
    return "";
  }

  if (/not found/i.test(trimmed)) {
    return "This information is not available yet.";
  }

  if (/too many requests|429/i.test(trimmed)) {
    return "Too many requests. Please wait a moment and try again.";
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
    if (response.status === 429) {
      const retryAfterSeconds = parseRetryAfterSeconds(response);
      const suffix = retryAfterSeconds
        ? ` Try again in about ${retryAfterSeconds} second${retryAfterSeconds === 1 ? "" : "s"}.`
        : "";
      throw new Error(
        (record.error || "Too many requests. Please wait and try again.") + suffix,
      );
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

async function fetchPortalResponse<T>(
  url: string,
  fallback: T,
  allowEmpty: boolean,
  transform?: (body: unknown) => T,
): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (response.status !== 429) {
    return readPortalResponse(response, fallback, allowEmpty, transform);
  }

  const retryAfterSeconds = parseRetryAfterSeconds(response) ?? 5;
  await sleep(retryAfterSeconds * 1000);

  const retryResponse = await fetch(url, { cache: "no-store" });
  return readPortalResponse(retryResponse, fallback, allowEmpty, transform);
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
    if (isThrottled(existing, minRefetchMs) && existing?.data !== undefined) {
      return existing.data as T;
    }
    stores.delete(key);
  } else if (isFresh(existing, ttlMs)) {
    return existing!.data as T;
  }

  if (!force && existing?.promise) {
    return existing.promise as Promise<T>;
  }

  const attemptAt = Date.now();
  const promise = fetchPortalResponse(url, fallback, allowEmpty, transform)
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

export function getPortalCacheUpdatedAt(key: string): number | null {
  const entry = stores.get(key);
  return entry?.updatedAt ? entry.updatedAt : null;
}
