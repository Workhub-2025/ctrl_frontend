import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { AppRole, isAdminRole, normalizeRole } from "@/lib/auth/role-model";
import { logAuthAuditEvent } from "@/lib/security/audit-log";
import { resolveCorrelationId } from "@/lib/observability/server-observability";

export interface ActionAuthContext {
  userId: number;
  role: AppRole;
  organization: string | null;
  correlationId: string;
}

const parseUserId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const getActionAuthContext = async (
  actionName: string,
  correlationId?: string
): Promise<ActionAuthContext> => {
  const resolvedCorrelationId = resolveCorrelationId(correlationId);
  const session = await getServerSession(authOptions);
  const userId = parseUserId(session?.user?.id);

  if (!session?.user || userId === null) {
    logAuthAuditEvent("authorization_denied", {
      action: actionName,
      reason: "missing_session",
      correlationId: resolvedCorrelationId,
    });
    throw new Error("Authentication required");
  }

  return {
    userId,
    role: normalizeRole(session.user.role),
    organization:
      typeof session.user.organization === "string" &&
      session.user.organization.trim().length > 0
        ? session.user.organization.trim()
        : null,
    correlationId: resolvedCorrelationId,
  };
};

export const requireAdminActionContext = async (
  actionName: string,
  correlationId?: string
) => {
  const context = await getActionAuthContext(actionName, correlationId);

  if (!isAdminRole(context.role)) {
    logAuthAuditEvent("authorization_denied", {
      action: actionName,
      reason: "insufficient_role",
      role: context.role,
      userId: context.userId,
      correlationId: context.correlationId,
    });
    throw new Error("Access denied. Admin permissions required.");
  }

  return context;
};

export const applyTenantScope = <T extends { organization?: string }>(
  params: T,
  context: ActionAuthContext
): T => {
  if (context.organization) {
    return {
      ...params,
      organization: context.organization,
    };
  }
  return params;
};

export const enforceTenantWrite = <T extends { organization?: string }>(
  payload: T,
  context: ActionAuthContext
): T => {
  if (!context.organization) {
    return payload;
  }

  if (
    typeof payload.organization === "string" &&
    payload.organization.trim().length > 0 &&
    payload.organization.trim() !== context.organization
  ) {
    throw new Error("Cross-tenant write is not permitted.");
  }

  return {
    ...payload,
    organization: context.organization,
  };
};
