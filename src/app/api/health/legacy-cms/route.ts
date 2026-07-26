import { NextResponse } from "next/server";
import { checkCmsReachability, logCmsConnectivityIssue } from "@/legacy-cms/connectivity";

export async function GET() {
  const issue = await checkCmsReachability();

  if (issue) {
    logCmsConnectivityIssue("health/strapi", issue);
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
