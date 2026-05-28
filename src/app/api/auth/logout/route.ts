import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  const secureCookie = process.env.NEXTAUTH_URL?.startsWith("https://") || process.env.VERCEL === "1";

  response.cookies.set({
    name: secureCookie ? "__Secure-next-auth.session-token" : "next-auth.session-token",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: 0,
  });

  return response;
}
