import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { isAdminRole } from "@/lib/auth/role-model";
import type {
  AdminBroadcastAudience,
  AdminBroadcastTemplateKey,
} from "@/lib/admin-comms-templates";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";

type BroadcastSendBody = {
  audience?: AdminBroadcastAudience;
  role?: string;
  clientDocumentId?: string;
  userDocumentId?: string;
  email?: string;
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
  const session = await getServerSession(authOptions);
  const strapiJwt = await getServerStrapiJwt();
  if (!session?.user?.id || !strapiJwt) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
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
