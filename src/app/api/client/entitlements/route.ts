import { NextResponse } from "next/server";
import { getClientEntitlementsBundle } from "@/services/client-upgrade.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
export async function GET() {
  try {
    await requireClientSession();
    const data = await getClientEntitlementsBundle();
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Entitlements could not be loaded");
  }
}
