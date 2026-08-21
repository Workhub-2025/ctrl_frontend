import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAdminDualAccess } from "@/lib/auth/admin-dual-access";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { isPlatformAssessmentSlug } from "@/lib/assessment-platform-registry";
import {
  groupAssessmentReleases,
  type FirebaseAssessmentRelease,
} from "@/lib/firebase-admin-tenancy-bff";

export async function GET(request: NextRequest) {
  const auth = await requireAdminDualAccess("recovery.read");
  if ("error" in auth) return auth.error;

  try {
    const releases = await auth.domainApi.request<FirebaseAssessmentRelease[]>({
      path: "/v1/assessment-releases",
      firebaseSessionCookie: auth.firebaseSessionCookie,
    });
    const versions = groupAssessmentReleases(releases);
    const slug = request.nextUrl.searchParams.get("slug")?.trim();
    if (slug && isPlatformAssessmentSlug(slug)) {
      return NextResponse.json({ data: versions[slug] ?? [] });
    }
    return NextResponse.json({ data: versions });
  } catch (error) {
    return handleBffRouteError(error, "Assessment versions could not be loaded");
  }
}
