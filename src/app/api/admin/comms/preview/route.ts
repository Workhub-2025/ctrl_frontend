import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { isAdminRole } from "@/lib/auth/role-model";
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
  const session = await getServerSession(authOptions);
  const strapiJwt = await getServerStrapiJwt();
  if (!session?.user?.id || !strapiJwt) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  }

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
