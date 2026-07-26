"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Queues an advance while progress is saving, then retries when `isSaving` clears.
 * Prevents permanent stalls when auto-advance fires during an in-flight save.
 */
export function useDeferredAdvance<TState>(
  isSaving: boolean,
  advance: (nextState?: TState) => Promise<void>,
) {
  const pending = useRef<{ state?: TState } | null>(null);

  useEffect(() => {
    if (isSaving || !pending.current) return;
    const next = pending.current;
    pending.current = null;
    void advance(next.state);
  }, [advance, isSaving]);

  return useCallback(
    (nextState?: TState) => {
      if (isSaving) {
        pending.current = { state: nextState };
        return;
      }
      void advance(nextState);
    },
    [advance, isSaving],
  );
}
