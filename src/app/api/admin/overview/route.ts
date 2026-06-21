import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { getAdminOverview } from "@/services/admin-platform.service";

export async function GET() {
  try {
    const auth = await requireAdminApiAccess('platform.overview');
    if ("error" in auth) {
      return auth.error;
    }
    const strapiJwt = auth.strapiJwt;

    const overview = await getAdminOverview(strapiJwt);
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
