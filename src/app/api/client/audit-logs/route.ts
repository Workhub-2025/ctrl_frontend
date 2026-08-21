import { NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import {
  createFirebaseClientPortalApi,
  toClientAuditLogs,
} from "@/lib/firebase-client-portal-api";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";

export async function GET() {
  try {
    const { context, domainApi, firebaseSessionCookie } =
      await requireFirebaseRecruitmentSession("client");
    if (!context.organizationId) {
      return NextResponse.json(
        { error: "Organisation membership is required" },
        { status: 403 },
      );
    }
    const portal = createFirebaseClientPortalApi(
      domainApi,
      firebaseSessionCookie,
    );
    const events = await portal.listAuditEvents(context.organizationId, {
      audience: "client",
    });
    return NextResponse.json({ data: toClientAuditLogs(events) });
  } catch (error) {
    return handleBffRouteError(error, "Audit logs could not be loaded");
  }
}
