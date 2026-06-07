import { NextResponse } from "next/server";
import { getClientDashboardSummary } from "@/services/client-portal.service";

export async function GET() {
  try {
    const summary = await getClientDashboardSummary();
    return NextResponse.json({ data: summary });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Client dashboard could not be loaded",
      },
      { status: 500 }
    );
  }
}
