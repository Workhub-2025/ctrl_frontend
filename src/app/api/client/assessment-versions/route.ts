import { NextResponse } from "next/server";
import { getAdminAssessmentVersions } from "@/services/admin-platform.service";
import { getClientEntitlementsBundle, requireClientSession } from "@/services/client-upgrade.service";

export async function GET() {
  try {
    const session = await requireClientSession();
    const entitlements = await getClientEntitlementsBundle();
    const slugs = entitlements.versionUpgradeAssessments.map((assessment) => assessment.slug);
    const data = await getAdminAssessmentVersions(slugs, session.user.jwt).catch(() => ({}));
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Assessment versions could not be loaded" },
      { status: 500 }
    );
  }
}
