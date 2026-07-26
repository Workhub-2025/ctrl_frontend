type QueryScope = Readonly<{
  userId: string;
  organizationId?: string;
}>;

const scopeKey = ({ userId, organizationId }: QueryScope) =>
  ["scope", userId, organizationId ?? "personal"] as const;

/**
 * Central TanStack Query-compatible keys. Keeping factories here prevents two
 * components from naming the same server state differently.
 */
export const portalQueryKeys = {
  all: ["portal"] as const,
  screen: (routeId: string, scope: QueryScope, params?: Readonly<Record<string, string>>) =>
    ["portal", "screen", routeId, ...scopeKey(scope), params ?? {}] as const,
  candidateWorkspace: (scope: QueryScope) =>
    ["portal", "candidate-workspace", ...scopeKey(scope)] as const,
  campaign: (scope: QueryScope, campaignId: string) =>
    ["portal", "campaign", ...scopeKey(scope), campaignId] as const,
  assignment: (scope: QueryScope, assignmentId: string) =>
    ["portal", "assignment", ...scopeKey(scope), assignmentId] as const,
  team: (scope: QueryScope) =>
    ["portal", "team", ...scopeKey(scope)] as const,
  billing: (scope: QueryScope) =>
    ["portal", "billing", ...scopeKey(scope)] as const,
  support: (scope: QueryScope) =>
    ["portal", "support", ...scopeKey(scope)] as const,
} as const;

export type PortalQueryKey = ReturnType<
  (typeof portalQueryKeys)[Exclude<keyof typeof portalQueryKeys, "all">]
>;
