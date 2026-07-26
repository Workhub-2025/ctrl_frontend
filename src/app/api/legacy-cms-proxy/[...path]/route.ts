import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getServerCmsJwt } from "@/legacy-cms/jwt";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";
import { getCmsApiBaseUrl, joinCmsApiPath } from "@/legacy-cms/server-url";
import { isAllowedProxyPath } from "./proxy-path";

const PROXY_RATE_LIMIT = 120;
const PROXY_RATE_WINDOW_MS = 60_000;
const MAX_PROXY_BODY_BYTES = 2 * 1024 * 1024;

async function forwardToStrapi(
  request: NextRequest,
  pathSegments: string[]
) {
  const ipAddress = extractClientIp(request);
  const rateLimit = await applyRateLimit({
    key: `legacy-cms-proxy:${ipAddress}`,
    limit: PROXY_RATE_LIMIT,
    windowMs: PROXY_RATE_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds ?? 60) } }
    );
  }

  if (!isAllowedProxyPath(pathSegments)) {
    return NextResponse.json({ error: "Forbidden path" }, { status: 403 });
  }
  const relativePath = pathSegments.join("/");

  const jwt = await getServerCmsJwt(request);
  if (!jwt) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const secret = process.env.NEXTAUTH_SECRET;
  const token = secret
    ? await getToken({ req: request, secret })
    : null;
  const tenant =
    typeof token?.organization === "string" && token.organization.trim().length > 0
      ? token.organization.trim()
      : null;

  const strapiUrl = new URL(joinCmsApiPath(getCmsApiBaseUrl(), relativePath));
  request.nextUrl.searchParams.forEach((value, key) => {
    strapiUrl.searchParams.set(key, value);
  });

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${jwt}`);

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  if (tenant) {
    headers.set("x-ctrl-tenant", tenant);
  }

  const method = request.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  if (hasBody) {
    const originRejected = rejectCrossOriginRequest(request);
    if (originRejected) {
      return originRejected;
    }

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > MAX_PROXY_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
  }

  const body = hasBody ? await request.arrayBuffer() : undefined;
  if (body && body.byteLength > MAX_PROXY_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const upstream = await fetch(strapiUrl.toString(), {
    method,
    headers,
    body,
    cache: "no-store",
  });

  const responseBody = await upstream.arrayBuffer();
  const response = new NextResponse(responseBody, {
    status: upstream.status,
    statusText: upstream.statusText,
  });

  const upstreamType = upstream.headers.get("content-type");
  if (upstreamType) {
    response.headers.set("Content-Type", upstreamType);
  }

  return response;
}

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return forwardToStrapi(request, path);
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}
