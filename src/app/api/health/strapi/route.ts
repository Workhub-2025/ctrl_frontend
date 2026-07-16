import { NextResponse } from "next/server";
import { checkStrapiReachability, logStrapiConnectivityIssue } from "@/lib/strapi-connectivity";

export async function GET() {
  const issue = await checkStrapiReachability();

  if (issue) {
    logStrapiConnectivityIssue("health/strapi", issue);
    return NextResponse.json(
      {
        ok: false,
        code: issue.code,
        error: "Backend dependency unavailable",
      },
      { status: issue.code === "private" || issue.code === "missing" ? 503 : 504 }
    );
  }

  return NextResponse.json({
    ok: true,
  });
}
