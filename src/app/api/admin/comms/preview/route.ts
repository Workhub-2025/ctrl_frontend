import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import type {
  AdminBroadcastAudience,
  AdminBroadcastContractTier,
  AdminBroadcastTemplateKey,
} from "@/lib/admin-comms-templates";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";

type BroadcastPreviewBody = {
  audience?: AdminBroadcastAudience;
  role?: string;
  clientDocumentId?: string;
  userDocumentId?: string;
  email?: string;
  contractTiers?: AdminBroadcastContractTier[];
  templateKey?: AdminBroadcastTemplateKey;
};

type BroadcastPreviewResponse = {
  data?: {
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
};

export async function POST(request: Request) {
  const auth = await requireAdminApiAccess('comms.send');
  if ("error" in auth) {
    return auth.error;
  }
  const strapiJwt = auth.strapiJwt;

  const body = (await request.json().catch(() => null)) as BroadcastPreviewBody | null;
  if (!body?.audience) {
    return NextResponse.json({ error: "audience is required" }, { status: 400 });
  }

  try {
    const response = await strapiRequest<BroadcastPreviewResponse>("/admin/comms/preview", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return NextResponse.json({ data: response.data ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recipient preview could not be resolved" },
      { status: 500 }
    );
  }
}
