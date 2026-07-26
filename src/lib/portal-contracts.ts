export type PortalRole =
  | "candidate"
  | "hiring_manager"
  | "client"
  | "admin";

export type UserContext = Readonly<{
  userId: string;
  firebaseUid: string;
  accountStatus: "active" | "suspended" | "closed";
  portalRole: PortalRole;
  organizationId?: string;
  seatId?: string;
  permissions: readonly string[];
}>;

/**
 * A server-derived authorization result. Firebase custom claims may help route
 * the request, but the domain API must derive role, tenant and permissions from
 * authoritative database memberships for every protected operation.
 */
export type AuthoritativeUserContext = UserContext & Readonly<{
  authorizationSource: "domain-database";
}>;

export type ScreenMetric = Readonly<{
  key: string;
  label: string;
  value: string | number;
  detail?: string;
}>;

export type ScreenDecision = Readonly<{
  id: string;
  title: string;
  reason: string;
  href: string;
  actionLabel: string;
  priority: "critical" | "attention" | "routine";
  dueAt?: string;
}>;

export type ScreenDTO<TData extends object = Record<string, never>> = Readonly<{
  routeId: string;
  generatedAt: string;
  title: string;
  description?: string;
  primaryAction?: Readonly<{
    key: string;
    label: string;
    href: string;
  }>;
  metrics?: readonly ScreenMetric[];
  decisions?: readonly ScreenDecision[];
  data: Readonly<TData>;
}>;

export function defineScreenDTO<TData extends object>(
  screen: ScreenDTO<TData>,
): ScreenDTO<TData> {
  return screen;
}
