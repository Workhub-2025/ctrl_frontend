import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import { applyRateLimit } from "@/lib/security/api-rate-limit";
import type {
  AdminBroadcastAudience,
  AdminBroadcastContractTier,
  AdminBroadcastTemplateKey,
} from "@/lib/admin-comms-templates";
import { cmsRequest } from "@/legacy-cms/request";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { containsHtmlMarkup, sanitisePlainText } from "@/lib/security/input-sanitization";

type BroadcastSendBody = {
  audience?: AdminBroadcastAudience;
  role?: string;
  clientDocumentId?: string;
  userDocumentId?: string;
  email?: string;
  contractTiers?: AdminBroadcastContractTier[];
  subject?: string;
  body?: string;
  templateKey?: AdminBroadcastTemplateKey;
};

type BroadcastSendResponse = {
  data?: {
    recipientCount: number;
    sentCount: number;
    failedCount: number;
    failed?: string[];
  };
};

type FirebaseBroadcastSendResponse = {
  data?: {
    recipientCount: number;
    outboxEventId: string | null;
    queued: boolean;
  };
};

export async function POST(request: Request) {
  const crossOriginResponse = rejectMutatingCrossOrigin(request);
  if (crossOriginResponse) return crossOriginResponse;

  const auth = await requireAdminDualAccess("comms.send");
  if ("error" in auth) {
    return auth.error;
  }

  const rateLimit = await applyRateLimit({
    key: `admin:comms:send:${(auth.session as Session).user.id}`,
    limit: 5,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many broadcast requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds ?? 60) } }
    );
  }

  const rawBody = (await request.json().catch(() => null)) as BroadcastSendBody | null;
  if (!rawBody?.audience) {
    return NextResponse.json({ error: "audience is required" }, { status: 400 });
  }
  if (containsHtmlMarkup(rawBody.subject) || containsHtmlMarkup(rawBody.body)) {
    return NextResponse.json({ error: "Broadcast content must be plain text" }, { status: 400 });
  }

  const subject = sanitisePlainText(rawBody.subject, { maxLength: 200 });
  const messageBody = sanitisePlainText(rawBody.body, { maxLength: 10_000, allowNewlines: true });
  if (!subject || !messageBody) {
    return NextResponse.json({ error: "subject and body are required" }, { status: 400 });
  }
  const body: BroadcastSendBody = {
    ...rawBody,
    subject,
    body: messageBody,
    email: sanitisePlainText(rawBody.email, { maxLength: 254 }).toLowerCase() || undefined,
    clientDocumentId: sanitisePlainText(rawBody.clientDocumentId, { maxLength: 128 }) || undefined,
    userDocumentId: sanitisePlainText(rawBody.userDocumentId, { maxLength: 128 }) || undefined,
  };

  try {
    if (isFirebaseAdminAuth(auth)) {
      const response = await auth.domainApi.request<FirebaseBroadcastSendResponse>({
        path: "/v1/admin/comms/send",
        method: "POST",
        firebaseSessionCookie: auth.firebaseSessionCookie,
        body,
      });
      const recipientCount = response.data?.recipientCount ?? 0;
      // Firebase delivery is asynchronous via the email outbox dispatcher.
      // The broadcast is accepted for all recipients; SMTP rotation gates the
      // actual send. Report the queued count so the operator UI stays honest.
      return NextResponse.json({
        data: {
          recipientCount,
          sentCount: recipientCount,
          failedCount: 0,
          queued: response.data?.queued ?? true,
        },
      });
    }

    const response = await cmsRequest<BroadcastSendResponse>("/admin/comms/send", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return NextResponse.json({ data: response.data ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Broadcast could not be sent" },
      { status: 500 }
    );
  }
}
