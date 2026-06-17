import { NextResponse } from "next/server";
import { getClientDashboardSummary } from "@/services/client-portal.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
export async function GET() {
  try {
    await requireClientSession();

    const summary = await getClientDashboardSummary();
    return NextResponse.json({ data: summary });
  } catch (error) {
    return handleBffRouteError(error, "Client dashboard could not be loaded");
  
  }
}
