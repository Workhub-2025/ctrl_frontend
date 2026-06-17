import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { forwardAssessmentAttemptRequest } from "@/lib/assessment-attempt-server";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const strapiJwt = await getServerStrapiJwt(request);
    if (!session?.user?.id || !strapiJwt) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const query = searchParams.toString();
    const { response, body } = await forwardAssessmentAttemptRequest(
      `/candidate-assessment-attempts/status${query ? `?${query}` : ""}`,
      { method: "GET" },
      strapiJwt
    );

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status check failed" },
      { status: 500 }
    );
  }
}
