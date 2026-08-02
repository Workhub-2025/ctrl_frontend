export type PortalRouteClassification =
  | "canonical"
  | "redirect"
  | "development"
  | "removed";

export type PortalRouteAudience =
  | "public"
  | "shared"
  | "candidate"
  | "hiring_manager"
  | "client"
  | "admin";

export type PortalRouteRecord = Readonly<{
  id: string;
  path: string;
  classification: PortalRouteClassification;
  audience: PortalRouteAudience;
  owner: string;
  canonicalPath?: string;
  removalDate?: `${number}-${number}-${number}`;
  implementation?: "live" | "adapter" | "planned";
}>;

const RETIREMENT_DATE = "2026-10-31" as const;

/**
 * Single source of truth for user-facing application routes.
 *
 * API routes are intentionally excluded: their port/merge/retire disposition is
 * tracked independently because a browser URL and an API contract have different
 * compatibility and removal requirements.
 */
export const PORTAL_ROUTES = [
  { id: "public.home", path: "/", classification: "canonical", audience: "public", owner: "growth", implementation: "live" },
  { id: "public.pricing", path: "/pricing", classification: "canonical", audience: "public", owner: "commercial", implementation: "live" },
  { id: "auth.login", path: "/auth/login", classification: "canonical", audience: "public", owner: "identity", implementation: "live" },
  { id: "auth.bootstrap", path: "/auth/bootstrap", classification: "canonical", audience: "public", owner: "identity", implementation: "live" },
  { id: "auth.accept-invitation", path: "/auth/accept-invitation", classification: "canonical", audience: "public", owner: "identity", implementation: "live" },
  { id: "auth.register", path: "/auth/register", classification: "redirect", audience: "public", owner: "identity", canonicalPath: "/auth/login", removalDate: RETIREMENT_DATE },
  { id: "auth.forgot-password", path: "/auth/forgot-password", classification: "canonical", audience: "public", owner: "identity", implementation: "live" },
  { id: "auth.reset-password", path: "/auth/reset-password", classification: "canonical", audience: "public", owner: "identity", implementation: "live" },
  { id: "auth.email-confirmed", path: "/auth/email-confirmed", classification: "canonical", audience: "public", owner: "identity", implementation: "live" },
  { id: "auth.equality-monitoring", path: "/auth/equality-monitoring", classification: "canonical", audience: "candidate", owner: "privacy", implementation: "live" },
  { id: "legal.accessibility", path: "/accessibility-statement", classification: "canonical", audience: "public", owner: "governance", implementation: "live" },
  { id: "legal.cookies", path: "/cookie-policy", classification: "canonical", audience: "public", owner: "governance", implementation: "live" },
  { id: "legal.dpa", path: "/data-processing-agreement", classification: "canonical", audience: "public", owner: "governance", implementation: "live" },
  { id: "legal.privacy", path: "/privacy-policy", classification: "canonical", audience: "public", owner: "governance", implementation: "live" },
  { id: "legal.subprocessors", path: "/sub-processors", classification: "canonical", audience: "public", owner: "governance", implementation: "live" },
  { id: "legal.terms", path: "/terms-conditions", classification: "canonical", audience: "public", owner: "governance", implementation: "live" },
  { id: "shared.profile", path: "/profile", classification: "canonical", audience: "shared", owner: "identity", implementation: "live" },
  { id: "shared.dashboard-router", path: "/dashboard", classification: "canonical", audience: "shared", owner: "identity", implementation: "live" },
  { id: "candidate.dashboard", path: "/candidate-dashboard", classification: "canonical", audience: "candidate", owner: "candidate-readiness", implementation: "live" },
  { id: "candidate.support", path: "/candidate-dashboard/support", classification: "canonical", audience: "candidate", owner: "support", implementation: "adapter" },
  { id: "candidate.assessment", path: "/assessment/[slug]", classification: "canonical", audience: "candidate", owner: "assessment-execution", implementation: "live" },
  { id: "candidate.session-join", path: "/join", classification: "canonical", audience: "public", owner: "candidate-readiness", implementation: "live" },
  { id: "candidate.my-assessments", path: "/candidate-dashboard/my-assessments", classification: "redirect", audience: "candidate", owner: "candidate-readiness", canonicalPath: "/candidate-dashboard", removalDate: RETIREMENT_DATE },
  { id: "candidate.help-support", path: "/candidate-dashboard/help-support", classification: "redirect", audience: "candidate", owner: "support", canonicalPath: "/candidate-dashboard/support", removalDate: RETIREMENT_DATE },
  { id: "candidate.results", path: "/results", classification: "removed", audience: "candidate", owner: "assessment-execution", removalDate: RETIREMENT_DATE },
  { id: "hm.dashboard", path: "/hiring-manager-dashboard", classification: "canonical", audience: "hiring_manager", owner: "campaign-evidence", implementation: "live" },
  { id: "hm.campaigns", path: "/hiring-manager-dashboard/campaigns", classification: "canonical", audience: "hiring_manager", owner: "campaign-evidence", implementation: "live" },
  { id: "hm.campaign-create", path: "/hiring-manager-dashboard/campaigns/create", classification: "canonical", audience: "hiring_manager", owner: "campaign-evidence", implementation: "live" },
  { id: "hm.campaign-detail", path: "/hiring-manager-dashboard/campaigns/[campaignId]", classification: "canonical", audience: "hiring_manager", owner: "campaign-evidence", implementation: "live" },
  { id: "hm.campaign-edit", path: "/hiring-manager-dashboard/campaigns/[campaignId]/edit", classification: "canonical", audience: "hiring_manager", owner: "campaign-evidence", implementation: "live" },
  { id: "hm.session-detail", path: "/hiring-manager-dashboard/campaigns/[campaignId]/sessions/[sessionId]", classification: "canonical", audience: "hiring_manager", owner: "campaign-evidence", implementation: "adapter" },
  { id: "hm.candidates", path: "/hiring-manager-dashboard/candidates", classification: "canonical", audience: "hiring_manager", owner: "candidate-decisions", implementation: "live" },
  { id: "hm.candidate-detail", path: "/hiring-manager-dashboard/candidates/[assignmentId]", classification: "canonical", audience: "hiring_manager", owner: "candidate-decisions", implementation: "live" },
  { id: "hm.assessments", path: "/hiring-manager-dashboard/assessments", classification: "canonical", audience: "hiring_manager", owner: "assessment-catalogue", implementation: "live" },
  { id: "hm.support", path: "/hiring-manager-dashboard/support", classification: "canonical", audience: "hiring_manager", owner: "support", implementation: "live" },
  { id: "hm.activity", path: "/hiring-manager-dashboard/activity", classification: "canonical", audience: "hiring_manager", owner: "governance", implementation: "adapter" },
  { id: "hm.sessions", path: "/hiring-manager-dashboard/sessions", classification: "redirect", audience: "hiring_manager", owner: "campaign-evidence", canonicalPath: "/hiring-manager-dashboard/campaigns", removalDate: RETIREMENT_DATE },
  { id: "hm.session-legacy", path: "/hiring-manager-dashboard/sessions/[sessionId]", classification: "redirect", audience: "hiring_manager", owner: "campaign-evidence", canonicalPath: "/hiring-manager-dashboard/campaigns", removalDate: RETIREMENT_DATE },
  { id: "hm.activity-legacy", path: "/hiring-manager-dashboard/activity-logs", classification: "redirect", audience: "hiring_manager", owner: "governance", canonicalPath: "/hiring-manager-dashboard/activity", removalDate: RETIREMENT_DATE },
  { id: "hm.recovery", path: "/hiring-manager-dashboard/assessment-recovery", classification: "removed", audience: "hiring_manager", owner: "assessment-execution", removalDate: RETIREMENT_DATE },
  { id: "client.dashboard", path: "/client-dashboard", classification: "canonical", audience: "client", owner: "client-decisions", implementation: "live" },
  { id: "client.team", path: "/client-dashboard/team", classification: "canonical", audience: "client", owner: "tenancy", implementation: "live" },
  { id: "client.campaigns", path: "/client-dashboard/campaigns", classification: "canonical", audience: "client", owner: "client-decisions", implementation: "live" },
  { id: "client.campaign-detail", path: "/client-dashboard/campaigns/[campaignId]", classification: "canonical", audience: "client", owner: "client-decisions", implementation: "live" },
  { id: "client.candidates", path: "/client-dashboard/candidates", classification: "canonical", audience: "client", owner: "client-decisions", implementation: "live" },
  { id: "client.billing", path: "/client-dashboard/billing", classification: "canonical", audience: "client", owner: "commercial", implementation: "live" },
  { id: "client.support", path: "/client-dashboard/support", classification: "canonical", audience: "client", owner: "support", implementation: "live" },
  { id: "client.activity", path: "/client-dashboard/activity", classification: "canonical", audience: "client", owner: "governance", implementation: "adapter" },
  { id: "client.team-legacy", path: "/client-dashboard/hiring-managers", classification: "redirect", audience: "client", owner: "tenancy", canonicalPath: "/client-dashboard/team", removalDate: RETIREMENT_DATE },
  { id: "client.campaign-approvals", path: "/client-dashboard/campaign-approvals", classification: "redirect", audience: "client", owner: "client-decisions", canonicalPath: "/client-dashboard/campaigns", removalDate: RETIREMENT_DATE },
  { id: "client.candidate-approvals", path: "/client-dashboard/candidate-approvals", classification: "redirect", audience: "client", owner: "client-decisions", canonicalPath: "/client-dashboard/candidates", removalDate: RETIREMENT_DATE },
  { id: "client.approved-candidates", path: "/client-dashboard/client-approved-candidates", classification: "redirect", audience: "client", owner: "client-decisions", canonicalPath: "/client-dashboard/candidates", removalDate: RETIREMENT_DATE },
  { id: "client.progressed", path: "/client-dashboard/progressed", classification: "redirect", audience: "client", owner: "client-decisions", canonicalPath: "/client-dashboard/campaigns", removalDate: RETIREMENT_DATE },
  { id: "client.messages", path: "/client-dashboard/messages", classification: "redirect", audience: "client", owner: "support", canonicalPath: "/client-dashboard/support", removalDate: RETIREMENT_DATE },
  { id: "client.upgrade", path: "/client-dashboard/upgrade-requests", classification: "redirect", audience: "client", owner: "commercial", canonicalPath: "/client-dashboard/billing", removalDate: RETIREMENT_DATE },
  { id: "client.activity-legacy", path: "/client-dashboard/activity-logs", classification: "redirect", audience: "client", owner: "governance", canonicalPath: "/client-dashboard/activity", removalDate: RETIREMENT_DATE },
  { id: "client.recovery", path: "/client-dashboard/assessment-recovery", classification: "removed", audience: "client", owner: "assessment-execution", removalDate: RETIREMENT_DATE },
  { id: "admin.dashboard", path: "/admin", classification: "canonical", audience: "admin", owner: "operations", implementation: "live" },
  { id: "admin.organizations", path: "/admin/organizations", classification: "canonical", audience: "admin", owner: "tenancy", implementation: "adapter" },
  { id: "admin.organization-detail", path: "/admin/organizations/[organizationId]", classification: "canonical", audience: "admin", owner: "tenancy", implementation: "adapter" },
  { id: "admin.billing", path: "/admin/billing", classification: "canonical", audience: "admin", owner: "commercial", implementation: "live" },
  { id: "admin.people", path: "/admin/people", classification: "canonical", audience: "admin", owner: "identity", implementation: "adapter" },
  { id: "admin.assessments", path: "/admin/assessments", classification: "canonical", audience: "admin", owner: "assessment-catalogue", implementation: "adapter" },
  { id: "admin.support", path: "/admin/support", classification: "canonical", audience: "admin", owner: "support", implementation: "adapter" },
  { id: "admin.communications", path: "/admin/communications", classification: "canonical", audience: "admin", owner: "communications", implementation: "adapter" },
  { id: "admin.governance", path: "/admin/governance", classification: "canonical", audience: "admin", owner: "governance", implementation: "adapter" },
  { id: "admin.analytics-legacy", path: "/admin/analytics", classification: "redirect", audience: "admin", owner: "operations", canonicalPath: "/admin", removalDate: RETIREMENT_DATE },
  { id: "admin.recovery-legacy", path: "/admin/assessment-recovery", classification: "redirect", audience: "admin", owner: "assessment-catalogue", canonicalPath: "/admin/assessments", removalDate: RETIREMENT_DATE },
  { id: "admin.audit-legacy", path: "/admin/audit-logs", classification: "redirect", audience: "admin", owner: "governance", canonicalPath: "/admin/governance", removalDate: RETIREMENT_DATE },
  { id: "admin.billing-requests-legacy", path: "/admin/billing/requests", classification: "redirect", audience: "admin", owner: "commercial", canonicalPath: "/admin/billing", removalDate: RETIREMENT_DATE },
  { id: "admin.clients-legacy", path: "/admin/clients", classification: "redirect", audience: "admin", owner: "tenancy", canonicalPath: "/admin/organizations", removalDate: RETIREMENT_DATE },
  { id: "admin.client-detail-legacy", path: "/admin/clients/[id]", classification: "redirect", audience: "admin", owner: "tenancy", canonicalPath: "/admin/organizations/[organizationId]", removalDate: RETIREMENT_DATE },
  { id: "admin.client-create-legacy", path: "/admin/clients/create", classification: "redirect", audience: "admin", owner: "tenancy", canonicalPath: "/admin/organizations", removalDate: RETIREMENT_DATE },
  { id: "admin.comms-legacy", path: "/admin/comms", classification: "redirect", audience: "admin", owner: "communications", canonicalPath: "/admin/communications", removalDate: RETIREMENT_DATE },
  { id: "admin.erasure-legacy", path: "/admin/erasure-requests", classification: "redirect", audience: "admin", owner: "governance", canonicalPath: "/admin/governance", removalDate: RETIREMENT_DATE },
  { id: "admin.settings-legacy", path: "/admin/settings", classification: "redirect", audience: "admin", owner: "identity", canonicalPath: "/profile", removalDate: RETIREMENT_DATE },
  { id: "admin.tickets-legacy", path: "/admin/tickets", classification: "redirect", audience: "admin", owner: "support", canonicalPath: "/admin/support", removalDate: RETIREMENT_DATE },
  { id: "admin.upgrades-legacy", path: "/admin/upgrade-requests", classification: "redirect", audience: "admin", owner: "commercial", canonicalPath: "/admin/billing", removalDate: RETIREMENT_DATE },
  { id: "admin.upgrade-detail-legacy", path: "/admin/upgrade-requests/[id]", classification: "redirect", audience: "admin", owner: "commercial", canonicalPath: "/admin/billing", removalDate: RETIREMENT_DATE },
  { id: "admin.users-legacy", path: "/admin/users", classification: "redirect", audience: "admin", owner: "identity", canonicalPath: "/admin/people", removalDate: RETIREMENT_DATE },
  { id: "admin.user-invite-legacy", path: "/admin/users/invite", classification: "redirect", audience: "admin", owner: "identity", canonicalPath: "/admin/people", removalDate: RETIREMENT_DATE },
] as const satisfies readonly PortalRouteRecord[];

export function getCanonicalPortalRoutes(audience?: PortalRouteAudience) {
  return PORTAL_ROUTES.filter(
    (route) =>
      route.classification === "canonical" &&
      (audience === undefined || route.audience === audience),
  );
}

export function findPortalRoute(pathname: string): PortalRouteRecord | undefined {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return PORTAL_ROUTES.find((route) => {
    const pattern = route.path
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\\\[[^\]]+\\\]/g, "[^/]+");
    return new RegExp(`^${pattern}$`).test(normalized);
  });
}
