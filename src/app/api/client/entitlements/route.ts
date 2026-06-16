import { NextResponse } from "next/server";
import { getClientEntitlementsBundle, requireClientSession } from "@/services/client-upgrade.service";

export async function GET() {
  try {
    await requireClientSession();
    const data = await getClientEntitlementsBundle();
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Entitlements could not be loaded";
    const status = message === "Authentication required" ? 401 : message === "Client access required" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
