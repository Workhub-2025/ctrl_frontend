import type { NextRequest } from "next/server";
import { forwardAdminTotpRequest } from "@/lib/auth/admin-totp-bff";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return forwardAdminTotpRequest(request, "/auth/admin/totp/disable", "POST", body);
}
