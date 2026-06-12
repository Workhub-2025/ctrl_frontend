import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";

// Forward requests to Strapi
const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

function getStrapiBaseUrl() {
  return stripTrailingSlashes(
    process.env.STRAPI_API_URL ??
      process.env.NEXT_PUBLIC_STRAPI_API_URL ??
      "http://localhost:1337/api"
  );
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  const { sessionId } = await context.params;
  const id = sessionId;
  const session = await getServerSession(authOptions);
  const limiter = await applyRateLimit({
    key: `hm-session-status:post:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
    limit: 15,
    windowMs: 60_000,
  });

  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please retry shortly." },
      {
        status: 429,
        headers: {
          "retry-after": String(limiter.retryAfterSeconds),
        },
      }
    );
  }

  if (!session?.user?.jwt) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { status } = body as { status?: "closed" };

    if (status !== "closed") {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const strapiRes = await fetch(
      `${getStrapiBaseUrl()}/assessment-sessions/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.jwt}`,
        },
        body: JSON.stringify({
          data: {
            sessionStatus: status,
          },
        }),
      }
    );

    if (!strapiRes.ok) {
      const errBody = await strapiRes.json().catch(() => null);
      return NextResponse.json(
        { error: errBody?.error?.message || "Failed to update session status" },
        { status: strapiRes.status }
      );
    }

    const data = await strapiRes.json();
    return NextResponse.json({ data: data.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
