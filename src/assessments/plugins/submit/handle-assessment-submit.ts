import { NextResponse } from "next/server";

/**
 * Legacy Strapi per-slug submit plugin. Firebase Preview uses
 * `/api/assessment-runtime` → domainApi attempt submit exclusively.
 */
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
