import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import {
  createHiringManagerAssessmentSession,
  getHiringManagerSessions,
} from "@/services/hiring-manager-campaigns.service";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const limiter = await applyRateLimit({
    key: `hm-sessions:get:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
    limit: 30,
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

  const result = await getHiringManagerSessions();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ data: result.sessions });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const limiter = await applyRateLimit({
    key: `hm-sessions:post:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
    limit: 10,
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

  try {
    const body = await request.json();
    if (!body?.campaignDocumentId || typeof body.campaignDocumentId !== "string") {
      return NextResponse.json({ error: "campaignDocumentId is required" }, { status: 400 });
    }
    if (!body?.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!Number.isInteger(body.candidateLimit) || body.candidateLimit < 1) {
      return NextResponse.json({ error: "candidateLimit must be at least 1" }, { status: 400 });
    }
    if (body.mode && !["in_person", "remote"].includes(body.mode)) {
      return NextResponse.json({ error: "mode must be either 'in_person' or 'remote'" }, { status: 400 });
    }

    const created = await createHiringManagerAssessmentSession({
      campaignDocumentId: body.campaignDocumentId,
      name: body.name,
      candidateLimit: body.candidateLimit,
      startsAt: body.startsAt,
      location: body.location,
      mode: body.mode,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Session could not be created",
      },
      { status: 500 }
    );
  }
}
