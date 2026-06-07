import { NextResponse } from "next/server";
import { getAdminAuditLogs } from "@/services/admin-platform.service";

export async function GET() {
  try {
    const logs = await getAdminAuditLogs();
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
