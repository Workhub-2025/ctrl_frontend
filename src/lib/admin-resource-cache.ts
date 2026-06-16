"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchPortalJson,
  invalidatePortalCache,
  normalizePortalError,
  peekPortalCache,
  PORTAL_CACHE_TTL_MS,
  PORTAL_MIN_REFETCH_MS,
  setPortalCacheData,
} from "@/lib/portal-fetch-cache";

type ResourceState<T> = {
  data: T;
  error: string | null;
  loading: boolean;
  mutate: (next: T) => void;
  refetch: () => Promise<T | null>;
};

type AdminResourceOptions = {
  ttlMs?: number;
  minRefetchMs?: number;
  /** Optional empty states (null/404) resolve to fallback without a banner error. */
  allowEmpty?: boolean;
};

export function invalidateAdminResource(key?: string) {
  invalidatePortalCache(key);
}

export function setAdminResourceData<T>(key: string, data: T) {
  setPortalCacheData(key, data);
}

export function useAdminResource<T>(
  key: string,
  url: string,
  fallback: T,
  ttlMs = PORTAL_CACHE_TTL_MS,
  options: AdminResourceOptions = {}
): ResourceState<T> {
  const { minRefetchMs = PORTAL_MIN_REFETCH_MS, allowEmpty = false } = options;
  const cached = useMemo(() => peekPortalCache<T>(key), [key]);
  const [data, setData] = useState<T>(() => cached ?? fallback);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => cached === undefined);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    async (force = false) => {
      if (mountedRef.current) setLoading(true);

      try {
        const next = await fetchPortalJson<T>({
          key,
          url,
          fallback,
          force,
          ttlMs,
          minRefetchMs,
          allowEmpty,
        });
        if (mountedRef.current) {
          setData(next);
          setError(null);
        }
        return next;
      } catch (err) {
        const message = normalizePortalError(
          err instanceof Error ? err.message : "Request could not be completed",
          allowEmpty
        );
        if (mountedRef.current) {
          if (message) setError(message);
          else setError(null);
        }
        return null;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [allowEmpty, fallback, key, minRefetchMs, ttlMs, url]
  );

  useEffect(() => {
    const warm = peekPortalCache<T>(key);
    if (warm !== undefined) {
      setData(warm);
      setLoading(false);
    }
    void load(false);
  }, [key, url, ttlMs, allowEmpty]); // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback(() => load(true), [load]);
  const mutate = useCallback(
    (next: T) => {
      setPortalCacheData(key, next);
      if (mountedRef.current) {
        setData(next);
        setError(null);
      }
    },
    [key]
  );

  return { data, error, loading, mutate, refetch };
}
