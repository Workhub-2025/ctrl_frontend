import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { getAdminRevenueAnalytics } from "@/services/admin-platform.service";

export async function GET() {
  try {
    const auth = await requireAdminApiAccess('analytics.read');
    if ("error" in auth) {
      return auth.error;
    }
    const strapiJwt = auth.strapiJwt;

    const analytics = await getAdminRevenueAnalytics(strapiJwt);
    return NextResponse.json({ data: analytics });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Revenue analytics could not be loaded",
      },
      { status: 500 }
    );
  }
}
