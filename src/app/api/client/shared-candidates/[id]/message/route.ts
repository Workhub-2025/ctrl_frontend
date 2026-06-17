import { NextRequest, NextResponse } from "next/server";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";
import {
  sendSharedCandidateMessage,
  type ClientOutreachTemplateKey,
} from "@/services/client-portal.service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const originRejected = rejectCrossOriginRequest(request);
  if (originRejected) {
    return originRejected;
  }

  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      subject?: string;
      body?: string;
      templateKey?: ClientOutreachTemplateKey;
    };

    if (!body.subject?.trim()) {
      return NextResponse.json({ error: "subject is required" }, { status: 400 });
    }
    if (!body.body?.trim()) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }

    const data = await sendSharedCandidateMessage(id, {
      subject: body.subject.trim(),
      body: body.body.trim(),
      templateKey: body.templateKey,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Message could not be sent",
      },
      { status: 500 }
    );
  }
}
