import { NextResponse } from "next/server";
import { getAdminAssessmentVersions } from "@/services/admin-platform.service";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { getClientEntitlementsBundle, requireClientSession } from "@/services/client-upgrade.service";

export async function GET() {
  try {
    await requireClientSession();
    const strapiJwt = await getServerStrapiJwt();
    if (!strapiJwt) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const entitlements = await getClientEntitlementsBundle();
    const slugs = entitlements.versionUpgradeAssessments.map((assessment) => assessment.slug);
    const data = await getAdminAssessmentVersions(slugs, strapiJwt).catch(() => ({}));
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Assessment versions could not be loaded" },
      { status: 500 }
    );
  }
}
