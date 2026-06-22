import "server-only";

import { requireClientSession } from "@/lib/auth/bff-session";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";

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
  const response = await strapiRequest<{ data?: ClientAuditLog[] }>("/client/audit-logs");
  return response.data ?? [];
}
