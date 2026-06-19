import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { isAdminRole } from "@/lib/auth/role-model";
import { forwardAssessmentAttemptRequest } from "@/lib/assessment-attempt-server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const strapiJwt = await getServerStrapiJwt(request);
    if (!session?.user?.id || !strapiJwt) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
    }

    const payload = await request.json().catch(() => ({}));
    const { response, body } = await forwardAssessmentAttemptRequest(
      "/candidate-assessment-attempts/admin/recover",
      { method: "POST", body: JSON.stringify(payload) },
      strapiJwt
    );

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recovery failed" },
      { status: 500 }
    );
  }
}
