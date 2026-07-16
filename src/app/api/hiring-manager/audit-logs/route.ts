import { NextResponse } from "next/server";
import { requireHmSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";

export async function GET() {
  try {
    await requireHmSession();
    const response = await strapiRequest<{ data?: unknown[] }>("/hiring-manager/audit-logs");
    return NextResponse.json({ data: response.data ?? [] });
  } catch (error) {
    return handleBffRouteError(error, "Activity logs could not be loaded");
  }
}
