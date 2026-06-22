import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { applyRateLimit } from "@/lib/security/api-rate-limit";
import type {
  AdminBroadcastAudience,
  AdminBroadcastContractTier,
  AdminBroadcastTemplateKey,
} from "@/lib/admin-comms-templates";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";

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

export async function POST(request: Request) {
  const auth = await requireAdminApiAccess('comms.send');
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

  const body = (await request.json().catch(() => null)) as BroadcastSendBody | null;
  if (!body?.audience) {
    return NextResponse.json({ error: "audience is required" }, { status: 400 });
  }

  try {
    const response = await strapiRequest<BroadcastSendResponse>("/admin/comms/send", {
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
