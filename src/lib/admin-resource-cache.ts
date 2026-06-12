"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type CacheEntry<T> = {
  data?: T;
  error?: string;
  promise?: Promise<T>;
  updatedAt: number;
};

type ResourceState<T> = {
  data: T;
  error: string | null;
  loading: boolean;
  mutate: (next: T) => void;
  refetch: () => Promise<T | null>;
};

const DEFAULT_TTL_MS = 30_000;
const cache = new Map<string, CacheEntry<unknown>>();

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || `Request failed with ${response.status}`);
  }

  return body.data as T;
}

function isFresh(entry: CacheEntry<unknown> | undefined, ttlMs: number) {
  return Boolean(entry?.data !== undefined && Date.now() - entry.updatedAt < ttlMs);
}

export function invalidateAdminResource(key?: string) {
  if (key) {
    cache.delete(key);
    return;
  }
  cache.clear();
}

export function setAdminResourceData<T>(key: string, data: T) {
  cache.set(key, { data, updatedAt: Date.now() });
}

export function useAdminResource<T>(
  key: string,
  url: string,
  fallback: T,
  ttlMs = DEFAULT_TTL_MS
): ResourceState<T> {
  const cached = useMemo(() => cache.get(key) as CacheEntry<T> | undefined, [key]);
  const [data, setData] = useState<T>(() => cached?.data ?? fallback);
  const [error, setError] = useState<string | null>(() => cached?.error ?? null);
  const [loading, setLoading] = useState(() => !isFresh(cached, ttlMs));
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async (force = false) => {
    const existing = cache.get(key) as CacheEntry<T> | undefined;

    if (!force && isFresh(existing, ttlMs)) {
      if (mountedRef.current) {
        setData(existing!.data as T);
        setError(null);
        setLoading(false);
      }
      return existing!.data as T;
    }

    const promise =
      !force && existing?.promise
        ? (existing.promise as Promise<T>)
        : requestJson<T>(url);

    cache.set(key, {
      data: existing?.data,
      error: existing?.error,
      promise,
      updatedAt: existing?.updatedAt ?? 0,
    });
    if (mountedRef.current) setLoading(true);

    try {
      const next = await promise;
      cache.set(key, { data: next, updatedAt: Date.now() });
      if (mountedRef.current) {
        setData(next);
        setError(null);
      }
      return next;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request could not be completed";
      cache.set(key, {
        data: existing?.data,
        error: message,
        updatedAt: existing?.updatedAt ?? 0,
      });
      if (mountedRef.current) setError(message);
      return null;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [key, ttlMs, url]);

  useEffect(() => {
    let cancelled = false;
    const existing = cache.get(key) as CacheEntry<T> | undefined;

    if (isFresh(existing, ttlMs)) {
      setData(existing!.data as T);
      setError(null);
      setLoading(false);
      return;
    }

    void load().then((next) => {
      if (cancelled || next === null) return;
      setData(next);
    });

    return () => {
      cancelled = true;
    };
  }, [key, load, ttlMs]);

  const refetch = useCallback(() => load(true), [load]);
  const mutate = useCallback((next: T) => {
    cache.set(key, { data: next, updatedAt: Date.now() });
    if (mountedRef.current) {
      setData(next);
      setError(null);
    }
  }, [key]);

  return { data, error, loading, mutate, refetch };
}
