import { NextResponse } from "next/server";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
export async function GET() {
  try {
    await requireClientSession();
    const response = await strapiRequest<{ data?: Record<string, unknown> }>("/platform-pricing");
    return NextResponse.json({ data: response.data ?? {} });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pricing could not be loaded";
    const status =
      message === "Authentication required"
        ? 401
        : message === "Client access required"
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
