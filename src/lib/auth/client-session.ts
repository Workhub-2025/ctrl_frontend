export type ClientAuthSession = {
  user?: any;
  expires?: string;
} | null;

let cachedSession: ClientAuthSession | undefined;
let sessionInFlight: Promise<ClientAuthSession> | null = null;

async function fetchClientSession(): Promise<ClientAuthSession> {
  const response = await fetch("/api/auth/session", {
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const session = await response.json();
  return session?.user ? session : null;
}

export async function getClientSession(options?: {
  force?: boolean;
}): Promise<ClientAuthSession> {
  if (typeof window === "undefined") {
    return null;
  }

  if (!options?.force && cachedSession !== undefined) {
    return cachedSession;
  }

  if (!options?.force && sessionInFlight) {
    return sessionInFlight;
  }

  sessionInFlight = fetchClientSession()
    .then((session) => {
      cachedSession = session;
      return session;
    })
    .catch(() => {
      cachedSession = null;
      return null;
    })
    .finally(() => {
      sessionInFlight = null;
    });

  return sessionInFlight;
}

export function clearClientSessionCache() {
  cachedSession = undefined;
  sessionInFlight = null;
}
