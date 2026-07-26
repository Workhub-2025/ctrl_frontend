"use client";

import { useQuery } from "@tanstack/react-query";
import type { ScreenDTO } from "@/lib/portal-contracts";
import { portalQueryKeys } from "@/lib/portal-query-keys";

export type PortalScreenQueryOptions<TData extends object> = Readonly<{
  routeId: string;
  userId: string;
  organizationId?: string;
  params?: Readonly<Record<string, string>>;
  load: (signal: AbortSignal) => Promise<ScreenDTO<TData>>;
  enabled?: boolean;
}>;

/**
 * Route-owned screen request seam. Page orchestrators call this once and pass
 * typed data down; leaf components do not fetch or resolve permissions.
 */
export function usePortalScreen<TData extends object>({
  routeId,
  userId,
  organizationId,
  params,
  load,
  enabled = true,
}: PortalScreenQueryOptions<TData>) {
  return useQuery({
    queryKey: portalQueryKeys.screen(
      routeId,
      { userId, organizationId },
      params,
    ),
    queryFn: ({ signal }) => load(signal),
    enabled,
  });
}
