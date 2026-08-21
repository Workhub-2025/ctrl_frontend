import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { requireAdminDualAccess } from "@/lib/auth/admin-dual-access";
import type {
  AdminBroadcastAudience,
  AdminBroadcastContractTier,
  AdminBroadcastTemplateKey,
} from "@/lib/admin-comms-templates";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";
import { sanitisePlainText } from "@/lib/security/input-sanitization";

type BroadcastPreviewBody = {
  audience?: AdminBroadcastAudience;
  role?: string;
  clientDocumentId?: string;
  userDocumentId?: string;
  email?: string;
  contractTiers?: AdminBroadcastContractTier[];
  templateKey?: AdminBroadcastTemplateKey;
};

type BroadcastPreviewData = {
  recipientCount: number;
  exceedsBatchLimit: boolean;
  personalized?: boolean;
  samplePreview?: {
    clientName: string;
    endDate: string;
    renewalPrice: string;
    recipientEmail: string;
  } | null;
};

export async function POST(request: Request) {
  const crossOriginResponse = rejectMutatingCrossOrigin(request);
  if (crossOriginResponse) return crossOriginResponse;

  const auth = await requireAdminDualAccess("comms.send");
  if ("error" in auth) {
    return auth.error;
  }
  const rateLimited = await rejectRateLimitedMutation(request, {
    scope: "admin:comms:preview",
    actorId: (auth.session as Session).user.id,
    limit: 120,
  });
  if (rateLimited) return rateLimited;

  const rawBody = (await request.json().catch(() => null)) as BroadcastPreviewBody | null;
  if (!rawBody?.audience) {
    return NextResponse.json({ error: "audience is required" }, { status: 400 });
  }
  const body: BroadcastPreviewBody = {
    ...rawBody,
    email: sanitisePlainText(rawBody.email, { maxLength: 254 }).toLowerCase() || undefined,
    clientDocumentId: sanitisePlainText(rawBody.clientDocumentId, { maxLength: 128 }) || undefined,
    userDocumentId: sanitisePlainText(rawBody.userDocumentId, { maxLength: 128 }) || undefined,
  };

  try {
    const response = await auth.domainApi.request<BroadcastPreviewData>({
      path: "/v1/admin/comms/preview",
      method: "POST",
      firebaseSessionCookie: auth.firebaseSessionCookie,
      body,
    });
    return NextResponse.json({ data: response });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recipient preview could not be resolved" },
      { status: 500 }
    );
  }
}
