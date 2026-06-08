import { NextResponse } from "next/server";
import { getClientOverview } from "@/services/client-portal.service";

export async function GET() {
  try {
    const overview = await getClientOverview();
    return NextResponse.json({ data: overview });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Client overview could not be loaded",
      },
      { status: 500 }
    );
  }
}
