import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { isAdminRole } from "@/lib/auth/role-model";
import { getStrapiApiBaseUrl, joinStrapiApiPath } from "@/lib/strapi-server";
import type { AdminBroadcastTemplateKey } from "@/lib/admin-comms-templates";

type TemplatesResponse = {
    data?: Record<AdminBroadcastTemplateKey, { subject: string; body: string }>;
};

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }
        if (!isAdminRole(session.user.role)) {
            return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
        }

        const strapiJwt = await getServerStrapiJwt();
        if (!strapiJwt) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const response = await fetch(
            joinStrapiApiPath(getStrapiApiBaseUrl(), "/admin/comms/templates"),
            {
                cache: "no-store",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${strapiJwt}`,
                },
            }
        );

        const body: TemplatesResponse = await response.json().catch(() => ({}));
        if (!response.ok) {
            const message = (body as { error?: { message?: string } })?.error?.message
                ?? `Strapi responded ${response.status}`;
            return NextResponse.json({ error: message }, { status: response.status });
        }

        return NextResponse.json({ data: body.data ?? null });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Broadcast templates could not be loaded" },
            { status: 500 }
        );
    }
}
