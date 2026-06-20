import "server-only";

import { getStrapiApiBaseUrl } from "@/lib/strapi-server";

const STRAPI_HEALTH_TIMEOUT_MS = 5_000;

export type StrapiConnectivityIssue = {
  code: "missing" | "private" | "frontend" | "unreachable";
  message: string;
  configuredUrl?: string;
};

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127(?:\.\d{1,3}){3}$/,
  /^10(?:\.\d{1,3}){3}$/,
  /^172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}$/,
  /^192\.168(?:\.\d{1,3}){2}$/,
  /^strapi$/i,
  /^host\.docker\.internal$/i,
];

const KNOWN_FRONTEND_HOSTS = new Set(["ctrl-assess.co.uk", "www.ctrl-assess.co.uk"]);
const EXPECTED_PRODUCTION_STRAPI_URL = "https://be.ctrl-assess.co.uk/api";

export function getConfiguredStrapiApiUrl() {
  return getStrapiApiBaseUrl();
}

function resolveStrapiHost(apiUrl: string) {
  try {
    return new URL(apiUrl).hostname;
  } catch {
    return null;
  }
}

function normalizeOrigin(value: string | undefined) {
  if (!value) return null;

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

function isPrivateOrLocalHost(hostname: string) {
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

function getFrontendOrigins() {
  return [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    "https://ctrl-assess.co.uk",
    "https://www.ctrl-assess.co.uk",
  ]
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin));
}

function isFrontendAppUrl(apiUrl: string) {
  try {
    const parsed = new URL(apiUrl);
    if (KNOWN_FRONTEND_HOSTS.has(parsed.hostname)) {
      return true;
    }

    return getFrontendOrigins().includes(parsed.origin);
  } catch {
    return false;
  }
}

export function validateStrapiApiUrlForServerless(): StrapiConnectivityIssue | null {
  const configured =
    process.env.STRAPI_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_STRAPI_API_URL?.trim() ||
    "";

  if (!configured) {
    return {
      code: "missing",
      message:
        "STRAPI_API_URL is not set. On Vercel set STRAPI_API_URL=https://be.ctrl-assess.co.uk/api",
    };
  }

  const apiUrl = getConfiguredStrapiApiUrl();
  const hostname = resolveStrapiHost(apiUrl);

  if (!hostname) {
    return {
      code: "missing",
      message: `STRAPI_API_URL is not a valid URL: ${configured}`,
      configuredUrl: configured,
    };
  }

  if (isFrontendAppUrl(apiUrl)) {
    return {
      code: "frontend",
      message: `STRAPI_API_URL points at the frontend app (${apiUrl}). Set STRAPI_API_URL=${EXPECTED_PRODUCTION_STRAPI_URL}; do not use https://www.ctrl-assess.co.uk/api because frontend /api/auth routes are handled by NextAuth, not Strapi.`,
      configuredUrl: apiUrl,
    };
  }

  if (isPrivateOrLocalHost(hostname)) {
    return {
      code: "private",
      message: `STRAPI_API_URL points to a private/local host (${hostname}) that Vercel cannot reach. Use the public backend URL: ${EXPECTED_PRODUCTION_STRAPI_URL}`,
      configuredUrl: apiUrl,
    };
  }

  return null;
}

export function isFetchTimeoutError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.name === "TimeoutError" || error.name === "AbortError") {
    return true;
  }

  const message = error.message.toLowerCase();
  return message.includes("timeout") || message.includes("aborted");
}

export async function checkStrapiReachability(): Promise<StrapiConnectivityIssue | null> {
  const configIssue = validateStrapiApiUrlForServerless();
  if (configIssue) {
    return configIssue;
  }

  const healthUrl = `${getConfiguredStrapiApiUrl().replace(/\/api$/, "")}/_health`;

  try {
    const response = await fetch(healthUrl, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(STRAPI_HEALTH_TIMEOUT_MS),
    });

    if (response.status === 204 || response.ok) {
      return null;
    }

    return {
      code: "unreachable",
      message: `Strapi health check failed with HTTP ${response.status}. Verify STRAPI_API_URL=${getConfiguredStrapiApiUrl()} is correct.`,
      configuredUrl: getConfiguredStrapiApiUrl(),
    };
  } catch (error) {
    const configuredUrl = getConfiguredStrapiApiUrl();
    const timedOut = isFetchTimeoutError(error);

    return {
      code: "unreachable",
      message: timedOut
        ? `Cannot reach Strapi at ${configuredUrl} from this server (timed out after ${STRAPI_HEALTH_TIMEOUT_MS / 1000}s). On Vercel, STRAPI_API_URL must be the public URL: https://be.ctrl-assess.co.uk/api — not a LAN IP like 192.168.1.38.`
        : `Cannot reach Strapi at ${configuredUrl}: ${error instanceof Error ? error.message : "unknown error"}`,
      configuredUrl,
    };
  }
}
