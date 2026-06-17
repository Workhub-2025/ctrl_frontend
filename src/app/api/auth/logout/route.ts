import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/next-auth-options";
import { logAuthAuditEvent } from "@/lib/security/audit-log";
import { getAuthRequestContext } from "@/lib/auth/session-config";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";

const wantsJsonResponse = (request: Request) =>
  request.headers.get("accept")?.includes("application/json") ?? false;

function clearSessionCookie(response: NextResponse) {
  const secureCookie =
    process.env.NEXTAUTH_URL?.startsWith("https://") || process.env.VERCEL === "1";

  response.cookies.set({
    name: secureCookie ? "__Secure-next-auth.session-token" : "next-auth.session-token",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: 0,
  });
}

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginRequest(request);
  if (forbidden) {
    return forbidden;
  }

  const { ipAddress, userAgent } = getAuthRequestContext(request);
  const session = await getServerSession(authOptions);

  logAuthAuditEvent("logout", {
    email: session?.user?.email,
    ipAddress,
    userAgent,
    userId: session?.user?.id,
  });

  if (wantsJsonResponse(request)) {
    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  }

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  clearSessionCookie(response);
  return response;
}
