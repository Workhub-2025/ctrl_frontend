import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import {
  loadFirebaseAssessmentVersionCatalog,
  resolveRequestedAssessmentSlugs,
} from "@/lib/firebase-assessment-catalogue-api";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireFirebaseSession();
    const slug = request.nextUrl.searchParams.get("slug")?.trim();
    const slugs = resolveRequestedAssessmentSlugs(slug);
    const versions = await loadFirebaseAssessmentVersionCatalog(
      auth.domainApi,
      auth.firebaseSessionCookie,
      slugs,
    );

    if (slug && slugs.length === 1) {
      return NextResponse.json({ data: versions[slugs[0]] ?? [] });
    }
    return NextResponse.json({ data: versions });
  } catch (error) {
    return handleBffRouteError(
      error,
      "Assessment versions could not be loaded",
    );
  }
}
