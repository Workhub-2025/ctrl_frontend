import type { NextRequest } from "next/server";
import { forwardAdminTotpRequest } from "@/lib/auth/admin-totp-bff";

export async function POST(request: NextRequest) {
  return forwardAdminTotpRequest(request, "/auth/admin/totp/begin-setup", "POST");
}
