import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import {
  getAdminAssessmentVersions,
  getStrapiErrorStatus,
} from "@/services/admin-platform.service";

const ASSESSMENT_SLUGS = [
  "situational-judgement",
  "typing",
  "prioritisation",
  "call-simulation",
  "short-term-memory",
];

export async function GET() {
  const auth = await requireAdminApiAccess('recovery.read');
  if ("error" in auth) return auth.error;

  try {
    const versions = await getAdminAssessmentVersions(ASSESSMENT_SLUGS, auth.strapiJwt);
    return NextResponse.json({ data: versions });
  } catch (error) {
    const upstreamStatus = getStrapiErrorStatus(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Assessment versions could not be loaded" },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 }
    );
  }
}
