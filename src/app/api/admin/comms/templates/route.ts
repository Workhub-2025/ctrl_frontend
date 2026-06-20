import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { isAdminRole } from "@/lib/auth/role-model";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";
import type { AdminBroadcastTemplateKey } from "@/lib/admin-comms-templates";

type TemplatesResponse = {
    data?: Record<AdminBroadcastTemplateKey, { subject: string; body: string }>;
};

export async function GET() {
    const session = await getServerSession(authOptions);
    const strapiJwt = await getServerStrapiJwt();
    if (!session?.user?.id || !strapiJwt) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
        return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
    }

    try {
        const response = await strapiRequest<TemplatesResponse>("/admin/comms/templates");
        return NextResponse.json({ data: response.data ?? null });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Broadcast templates could not be loaded" },
            { status: 500 }
        );
    }
}
