import { NextResponse } from "next/server";
import { getClientIntegrityEvents } from "@/services/client-logs.service";
import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";

export async function GET() {
  try {
    await requireClientSession();
    const data = await getClientIntegrityEvents();
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Integrity events could not be loaded");
  }
}
