import { NextResponse } from "next/server";
import { getClientAuditLogs } from "@/services/client-logs.service";
import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";

export async function GET() {
  try {
    await requireClientSession();
    const data = await getClientAuditLogs();
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Audit logs could not be loaded");
  }
}
