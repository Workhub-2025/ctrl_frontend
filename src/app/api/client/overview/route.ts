import { NextResponse } from "next/server";
import { getClientOverview } from "@/services/client-portal.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
export async function GET() {
  try {
    await requireClientSession();

    const overview = await getClientOverview();
    return NextResponse.json({ data: overview });
  } catch (error) {
    return handleBffRouteError(error, "Client overview could not be loaded");
  
  }
}
