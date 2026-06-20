import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { getAdminAssessmentVersions } from "@/services/admin-platform.service";

const ASSESSMENT_SLUGS = [
  "situational-judgement",
  "typing",
  "prioritisation",
  "call-simulation",
  "short-term-memory",
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const strapiJwt = await getServerStrapiJwt(request);
    if (!session?.user?.id || !strapiJwt) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const versions = await getAdminAssessmentVersions(ASSESSMENT_SLUGS, strapiJwt);
    return NextResponse.json({ data: versions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Assessment versions could not be loaded" },
      { status: 500 }
    );
  }
}
