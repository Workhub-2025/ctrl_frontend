/**
 * Retired per-slug submit plugin. Live submit is
 * `/api/assessment-runtime` → domain API attempt submit.
 */
import { NextResponse } from "next/server";

export async function handleAssessmentSubmit(slug: string, _request: Request) {
  return NextResponse.json(
    {
      error:
        "Legacy assessment submit is retired. Use /api/assessment-runtime attempt submit.",
      code: "ASSESSMENT_SUBMIT_RETIRED",
      slug,
    },
    { status: 410 },
  );
}
