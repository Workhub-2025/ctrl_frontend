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

  const message = error instanceof Error ? error.message : fallbackMessage;
  const status =
    message === "Authentication required"
      ? 401
      : message.endsWith(" access required")
        ? 403
        : 500;

  return NextResponse.json({ error: message }, { status });
}
