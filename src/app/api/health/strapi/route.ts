import { NextResponse } from "next/server";
import { checkStrapiReachability } from "@/lib/strapi-connectivity";

export async function GET() {
  const issue = await checkStrapiReachability();

  if (issue) {
    return NextResponse.json(
      {
        ok: false,
        code: issue.code,
        error: issue.message,
        configuredUrl: issue.configuredUrl,
      },
      { status: issue.code === "private" || issue.code === "missing" ? 503 : 504 }
    );
  }

  return NextResponse.json({
    ok: true,
    configuredUrl: process.env.STRAPI_API_URL ?? process.env.NEXT_PUBLIC_STRAPI_API_URL,
  });
}
