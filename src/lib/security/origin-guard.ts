import { NextResponse } from "next/server";

const getExpectedOrigin = () => {
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    return new URL(base).origin;
  } catch {
    return "http://localhost:3000";
  }
};

const matchesExpectedOrigin = (value: string | null) => {
  if (!value) {
    return false;
  }

  try {
    return new URL(value).origin === getExpectedOrigin();
  } catch {
    return false;
  }
};

/**
 * Rejects cross-site POSTs to state-changing auth routes in production.
 */
export function rejectCrossOriginRequest(request: Request): Response | null {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (matchesExpectedOrigin(origin) || matchesExpectedOrigin(referer)) {
    return null;
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
