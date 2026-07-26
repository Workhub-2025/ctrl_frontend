import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import {
  groupAssessmentReleases,
  type FirebaseAssessmentRelease,
} from "@/lib/firebase-admin-tenancy-bff";
import {
  getAdminAssessmentVersions,
  getCmsErrorStatus,
} from "@/services/admin-platform.service";

const ASSESSMENT_SLUGS = [
  "call-simulation",
  "prioritisation",
  "situational-judgement",
  "short-term-memory",
  "typing",
];

function resolveRequestedSlugs(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim();
  if (slug && ASSESSMENT_SLUGS.includes(slug)) {
    return [slug];
  }
  return ASSESSMENT_SLUGS;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminDualAccess("recovery.read");
  if ("error" in auth) return auth.error;

  try {
    if (isFirebaseAdminAuth(auth)) {
      const releases = await auth.domainApi.request<FirebaseAssessmentRelease[]>({
        path: "/v1/assessment-releases",
        firebaseSessionCookie: auth.firebaseSessionCookie,
      });
      const versions = groupAssessmentReleases(releases);
      const slug = request.nextUrl.searchParams.get("slug")?.trim();
      if (slug && ASSESSMENT_SLUGS.includes(slug)) {
        return NextResponse.json({ data: versions[slug] ?? [] });
      }
      return NextResponse.json({ data: versions });
    }

    const slugs = resolveRequestedSlugs(request);
    const versions = await getAdminAssessmentVersions(slugs, auth.cmsJwt);
    const slug = request.nextUrl.searchParams.get("slug")?.trim();
    if (slug && ASSESSMENT_SLUGS.includes(slug)) {
      return NextResponse.json({ data: versions[slug] ?? [] });
    }
    return NextResponse.json({ data: versions });
  } catch (error) {
    const upstreamStatus = getCmsErrorStatus(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Assessment versions could not be loaded",
      },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 },
    );
  }
}
