import { NextResponse } from "next/server";

export class BffAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BffAuthError";
    this.status = status;
  }
}

export function handleBffRouteError(error: unknown, fallbackMessage = "Request failed") {
  if (error instanceof BffAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const upstreamStatus = getUpstreamErrorStatus(error);
  if (upstreamStatus) {
    const message = error instanceof Error ? error.message : fallbackMessage;
    return NextResponse.json({ error: message }, { status: upstreamStatus });
  }

  const message = error instanceof Error ? error.message : fallbackMessage;
  const status =
    message === "Authentication required"
      ? 401
      : message.endsWith(" access required")
        ? 403
        : 500;

  return NextResponse.json({ error: message }, { status });
}

function getUpstreamErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("status" in error)) {
    return null;
  }

  const status = (error as { status?: unknown }).status;
  if (typeof status !== "number" || status < 400 || status > 599) {
    return null;
  }

  return status;
}
