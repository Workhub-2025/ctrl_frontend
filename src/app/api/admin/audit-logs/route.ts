import { NextResponse } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import {
  toAdminAuditLogRows,
  type FirebaseAdminAuditEvent,
  type FirebaseOrganization,
} from "@/lib/firebase-admin-tenancy-bff";
import { getAdminAuditLogs } from "@/services/admin-platform.service";

const AUDIT_EVENTS_PER_ORG = 100;

export async function GET() {
  try {
    const auth = await requireAdminDualAccess("audit.read");
    if ("error" in auth) {
      return auth.error;
    }

    if (isFirebaseAdminAuth(auth)) {
      const organizations = await auth.domainApi.request<FirebaseOrganization[]>({
        path: "/v1/organizations",
        firebaseSessionCookie: auth.firebaseSessionCookie,
      });
      const organizationNameById = new Map(
        organizations.map((organization) => [
          organization.id,
          organization.legalName,
        ]),
      );
      const [eventsByOrg, platformEvents] = await Promise.all([
        Promise.all(
          organizations.map((organization) =>
            auth.domainApi.request<FirebaseAdminAuditEvent[]>({
              path: `/v1/organizations/${encodeURIComponent(organization.id)}/audit-events?limit=${AUDIT_EVENTS_PER_ORG}`,
              firebaseSessionCookie: auth.firebaseSessionCookie,
            }),
          ),
        ),
        auth.domainApi
          .request<FirebaseAdminAuditEvent[]>({
            path: `/v1/admin/platform-audit-events?limit=${AUDIT_EVENTS_PER_ORG}`,
            firebaseSessionCookie: auth.firebaseSessionCookie,
          })
          .catch(() => [] as FirebaseAdminAuditEvent[]),
      ]);
      const events = [...platformEvents, ...eventsByOrg.flat()];
      return NextResponse.json({
        data: toAdminAuditLogRows(events, organizationNameById),
        meta: {
          notice:
            "Firebase audit view merges platform-scoped events (organizationId null) with tenant-scoped organization streams.",
        },
      });
    }

    const logs = await getAdminAuditLogs(auth.cmsJwt);
    return NextResponse.json({ data: logs });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Audit logs could not be loaded",
      },
      { status: 500 },
    );
  }
}
