import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { forwardAssessmentAttemptRequest } from "@/lib/assessment-attempt-server";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminApiAccess('recovery.read');
    if ("error" in auth) {
      return auth.error;
    }
    const strapiJwt = auth.strapiJwt;const { searchParams } = request.nextUrl;
    const query = searchParams.toString();
    const { response, body } = await forwardAssessmentAttemptRequest(
      `/candidate-assessment-attempts/admin/list${query ? `?${query}` : ""}`,
      { method: "GET" },
      strapiJwt
    );

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load attempts" },
      { status: 500 }
    );
  }
}
