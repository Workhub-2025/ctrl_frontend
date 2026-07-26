import { sanitiseAccessCode } from "@/lib/security/input-sanitization";

const STORAGE_KEY = "ctrl.pendingSessionJoin";

export type PendingSessionJoin = Readonly<{
  accessCode: string;
  displayName: string;
  email: string;
  createdAt: number;
}>;

function isPendingSessionJoin(value: unknown): value is PendingSessionJoin {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.accessCode === "string" &&
    record.accessCode.length >= 4 &&
    typeof record.displayName === "string" &&
    record.displayName.trim().length >= 1 &&
    typeof record.email === "string" &&
    record.email.includes("@") &&
    typeof record.createdAt === "number"
  );
}

export function storePendingSessionJoin(input: {
  accessCode: string;
  displayName: string;
  email: string;
}): PendingSessionJoin {
  const pending: PendingSessionJoin = {
    accessCode: sanitiseAccessCode(input.accessCode),
    displayName: input.displayName.trim().replace(/\s+/g, " "),
    email: input.email.trim().toLowerCase(),
    createdAt: Date.now(),
  };
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  }
  return pending;
}

export function readPendingSessionJoin(): PendingSessionJoin | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isPendingSessionJoin(parsed)) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    // Drop stale pending joins after 24h (matches access-code TTL).
    if (Date.now() - parsed.createdAt > 24 * 60 * 60 * 1000) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingSessionJoin(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function resolvePendingAccessCode(
  fallbackAccessCode?: string | null,
): string | null {
  const pending = readPendingSessionJoin();
  if (pending?.accessCode) return pending.accessCode;
  if (typeof fallbackAccessCode === "string" && fallbackAccessCode.trim()) {
    return sanitiseAccessCode(fallbackAccessCode);
  }
  return null;
}
