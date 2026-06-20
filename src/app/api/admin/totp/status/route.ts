import type { NextRequest } from "next/server";
import { forwardAdminTotpRequest } from "@/lib/auth/admin-totp-bff";

export async function GET(request: NextRequest) {
  return forwardAdminTotpRequest(request, "/auth/admin/totp/status", "GET");
}
