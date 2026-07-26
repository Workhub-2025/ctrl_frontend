import { NextResponse } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import {
  toAdminAuditLogRows,
} from "@/lib/firebase-admin-tenancy-bff";
import { createFirebaseScreenApi } from "@/lib/firebase-screen-api";
import { getAdminAuditLogs } from "@/services/admin-platform.service";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminDualAccess("audit.read");
    if ("error" in auth) {
      return auth.error;
    }

    if (isFirebaseAdminAuth(auth)) {
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get("limit") ?? "100", 10);
      const cursor = url.searchParams.get("cursor") ?? undefined;

      const screens = createFirebaseScreenApi(auth.domainApi, auth.firebaseSessionCookie);
      const auditResult = await screens.getAdminAuditEvents({ limit, cursor });

      const events = auditResult.events ?? auditResult.items ?? [];
      return NextResponse.json({
        data: toAdminAuditLogRows(events, new Map()),
        meta: {
          nextCursor: auditResult.nextCursor ?? null,
          notice:
            "Firebase audit view streams combined platform and tenant audit logs via paginated index query.",
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
