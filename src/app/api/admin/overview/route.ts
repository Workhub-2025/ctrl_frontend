import { NextResponse } from "next/server";
import { getAdminOverview } from "@/services/admin-platform.service";

export async function GET() {
  try {
    const overview = await getAdminOverview();
    return NextResponse.json({ data: overview });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Admin overview could not be loaded",
      },
      { status: 500 }
    );
  }
}
