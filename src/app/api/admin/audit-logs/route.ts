import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { getAdminAuditLogs } from "@/services/admin-platform.service";

export async function GET() {
  try {
    const auth = await requireAdminApiAccess('audit.read');
    if ("error" in auth) {
      return auth.error;
    }
    const strapiJwt = auth.strapiJwt;

    const logs = await getAdminAuditLogs(strapiJwt);
    return NextResponse.json({ data: logs });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Audit logs could not be loaded",
      },
      { status: 500 }
    );
  }
}
