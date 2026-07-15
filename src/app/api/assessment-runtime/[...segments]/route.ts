import { NextRequest, NextResponse } from "next/server";
import { forwardAssessmentRuntime } from "@/lib/assessment-runtime-server";

type RouteContext = { params: Promise<{ segments: string[] }> };

function allowed(method: string, segments: string[]) {
  const path = segments.join("/");
  if (method === "GET") {
    return path === "readiness" || /^attempts\/[^/]+\/status$/.test(path);
  }
  if (method === "POST") {
    return path === "start" || /^attempts\/[^/]+\/(heartbeat|events|submit|restart)$/.test(path);
  }
  return method === "PATCH" && /^attempts\/[^/]+\/progress$/.test(path);
}

async function handle(request: NextRequest, context: RouteContext) {
  const { segments } = await context.params;
  if (!allowed(request.method, segments)) {
    return NextResponse.json({ error: "Assessment runtime route not found" }, { status: 404 });
  }
  const query = request.nextUrl.search;
  const body = ["POST", "PATCH"].includes(request.method) ? await request.text() : undefined;
  const result = await forwardAssessmentRuntime(
    request,
    `/assessment-runtime/${segments.map(encodeURIComponent).join("/")}${query}`,
    { method: request.method, ...(body ? { body } : {}) }
  );
  return NextResponse.json(result.body, {
    status: result.status,
    headers: { "Cache-Control": "no-store" },
  });
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
