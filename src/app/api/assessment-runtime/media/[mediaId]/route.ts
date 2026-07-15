import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { getStrapiApiBaseUrl, joinStrapiApiPath } from "@/lib/strapi-server";

const MEDIA_ID = /^[a-z0-9-]{2,80}$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const [session, jwt] = await Promise.all([
    getServerSession(authOptions),
    getServerStrapiJwt(request),
  ]);
  if (!session?.user?.id || !jwt) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const { mediaId } = await params;
  const slug = request.nextUrl.searchParams.get("slug");
  const release = request.nextUrl.searchParams.get("release");
  const candidateSessionDocumentId = request.nextUrl.searchParams.get("candidateSessionDocumentId");
  const attemptId = request.nextUrl.searchParams.get("attemptId");
  if (
    !MEDIA_ID.test(mediaId) ||
    !slug ||
    !release ||
    Boolean(candidateSessionDocumentId) === Boolean(attemptId)
  ) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }
  const query = new URLSearchParams({ slug, release });
  if (candidateSessionDocumentId) query.set("candidateSessionDocumentId", candidateSessionDocumentId);
  if (attemptId) query.set("attemptId", attemptId);
  const source = joinStrapiApiPath(
    getStrapiApiBaseUrl(),
    `/assessment-runtime/media/${encodeURIComponent(mediaId)}?${query.toString()}`
  );
  const range = request.headers.get("range");
  const response = await fetch(source, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${jwt}`,
      ...(range ? { Range: range } : {}),
    },
  });
  if (!response.ok || !response.body) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }
  const headers = new Headers({
    "Content-Type": response.headers.get("content-type") ?? "audio/mp4",
    "Accept-Ranges": response.headers.get("accept-ranges") ?? "bytes",
    "Cache-Control": "private, max-age=86400, immutable",
  });
  for (const name of ["content-length", "content-range"]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new NextResponse(response.body, { status: response.status, headers });
}
