import { NextResponse } from "next/server";
import evidence from "@/lib/demo/demo-candidate-evidence.json";

/**
 * Candidate responses for the public demo report at /demo/candidate-report.
 *
 * Deliberately separate from the authenticated hiring-manager evidence route:
 * this serves a frozen fixture and nothing else. It reads no session, no
 * database and no domain API, so there is no path from here to real candidate
 * work — which is why the demo does not need an unauthenticated branch inside
 * the real route.
 *
 * The response matches `reportEvidenceSchema`, so the panel parses it with the
 * same schema it uses in production.
 */

const sections = evidence as Record<string, unknown>;

export function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("campaignAssessmentId");
  const data = id ? sections[id] : undefined;

  if (!data) {
    return NextResponse.json(
      { error: "Unknown demo assessment" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}
