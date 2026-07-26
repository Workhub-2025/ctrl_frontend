import "server-only";

import { requireClientSession } from "@/lib/auth/bff-session";
import { cmsRequest } from "@/legacy-cms/request";

export type ClientAuditLog = {
  id: string;
  actorUserId: string;
  actorRole: string;
  actionType: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, any> | null;
  occurredAt: string;
  createdAt: string;
  actorDisplayName?: string;
  clientDisplayName?: string | null;
  resourceDisplayName?: string | null;
  metadataResolved?: Record<string, string>;
  summary?: string;
};

export async function getClientAuditLogs(): Promise<ClientAuditLog[]> {
  await requireClientSession();
  const response = await cmsRequest<{ data?: ClientAuditLog[] }>("/client/audit-logs");
  return response.data ?? [];
}
