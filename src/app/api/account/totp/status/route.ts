import type { NextRequest } from "next/server";
import { forwardPortalTotpRequest } from "@/lib/auth/admin-totp-bff";

export async function GET(request: NextRequest) {
  return forwardPortalTotpRequest(request, "/auth/totp/status", "GET");
}
