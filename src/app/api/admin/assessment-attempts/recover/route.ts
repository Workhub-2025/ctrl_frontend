import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { forwardAssessmentAttemptRequest } from "@/lib/assessment-attempt-server";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApiAccess('recovery.write');
    if ("error" in auth) {
      return auth.error;
    }
    const strapiJwt = auth.strapiJwt;
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
