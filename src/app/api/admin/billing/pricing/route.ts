import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { isAdminRole } from "@/lib/auth/role-model";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";

async function requireAdminStrapiSession() {
  const session = await getServerSession(authOptions);
  const strapiJwt = await getServerStrapiJwt();
  if (!session?.user?.id || !strapiJwt) {
    return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }
  if (!isAdminRole(session.user.role)) {
    return { error: NextResponse.json({ error: "Administrator access required" }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  const auth = await requireAdminStrapiSession();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const response = await strapiRequest<{ data?: Record<string, unknown> }>("/platform-pricing");
    return NextResponse.json({ data: response.data ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pricing could not be loaded" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdminStrapiSession();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const body = await request.json();
    const response = await strapiRequest<{ data?: Record<string, unknown> }>("/admin/platform-pricing", {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return NextResponse.json({ data: response.data ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pricing could not be saved" },
      { status: 500 }
    );
  }
}
