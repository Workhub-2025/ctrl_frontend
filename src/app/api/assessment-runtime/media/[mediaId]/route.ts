import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";

const MEDIA_ID = /^[a-z0-9-]{2,80}$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const auth = await requireFirebaseSession("candidate");
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
    const signed = await auth.domainApi.request<{ url: string }>({
      path: `/v1/assessment-runtime/media/${encodeURIComponent(mediaId)}?${query.toString()}`,
      firebaseSessionCookie: auth.firebaseSessionCookie,
    });
    const signedUrl = new URL(signed.url);
    if (
      signedUrl.protocol !== "https:" ||
      signedUrl.hostname !== "storage.googleapis.com"
    ) {
      throw new Error("Assessment media signer returned an invalid host");
    }
    const range = request.headers.get("range");
    const upstream = await fetch(signedUrl, {
      cache: "no-store",
      headers: range ? { Range: range } : {},
    });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }
    const headers = new Headers({
      "Content-Type": upstream.headers.get("content-type") ?? "audio/mp4",
      "Accept-Ranges": upstream.headers.get("accept-ranges") ?? "bytes",
      "Cache-Control": "private, max-age=300",
    });
    for (const name of ["content-length", "content-range"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    return handleBffRouteError(error, "Assessment media could not be loaded");
  }
}
