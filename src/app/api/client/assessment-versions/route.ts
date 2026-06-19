import { NextResponse } from "next/server";
import { getAdminAssessmentVersions } from "@/services/admin-platform.service";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { getClientEntitlementsBundle } from "@/services/client-upgrade.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
export async function GET() {
  try {
    await requireClientSession();
    const strapiJwt = await getServerStrapiJwt();
    if (!strapiJwt) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const entitlements = await getClientEntitlementsBundle();
    const slugs = [
      ...(entitlements?.defaultAssessments ?? []).map((assessment) => assessment.slug),
      ...(entitlements?.additionalAssessments ?? []).map((assessment) => assessment.slug),
    ];
    const data = await getAdminAssessmentVersions(slugs, strapiJwt).catch(() => ({}));
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Assessment versions could not be loaded");
  }
}
