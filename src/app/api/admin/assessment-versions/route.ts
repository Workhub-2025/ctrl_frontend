import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { isAdminRole } from "@/lib/auth/role-model";
import {
  getAdminAssessmentVersions,
  getStrapiErrorStatus,
} from "@/services/admin-platform.service";

const ASSESSMENT_SLUGS = [
  "situational-judgement",
  "typing",
  "prioritisation",
  "call-simulation",
];

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }
  if (!isAdminRole(session.user.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Administrator access required" }, { status: 403 }),
    };
  }
  return { ok: true as const, session };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const versions = await getAdminAssessmentVersions(ASSESSMENT_SLUGS, auth.session.user.jwt);
    return NextResponse.json({ data: versions });
  } catch (error) {
    const upstreamStatus = getStrapiErrorStatus(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Assessment versions could not be loaded" },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 }
    );
  }
}
