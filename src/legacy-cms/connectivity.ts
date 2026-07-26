import "server-only";

import { getCmsApiBaseUrl } from "@/legacy-cms/server-url";

const CMS_HEALTH_TIMEOUT_MS = 5_000;

export type CmsConnectivityIssue = {
  code: "missing" | "private" | "frontend" | "unreachable";
  message: string;
  configuredUrl?: string;
};

export const PUBLIC_CMS_UNAVAILABLE_MESSAGE =
  "The account service is temporarily unavailable. Please try again shortly.";

/** @deprecated Use PUBLIC_CMS_UNAVAILABLE_MESSAGE */
export const PUBLIC_STRAPI_UNAVAILABLE_MESSAGE = PUBLIC_CMS_UNAVAILABLE_MESSAGE;

export function logCmsConnectivityIssue(
  context: string,
  issue: CmsConnectivityIssue,
) {
  console.error(`[${context}] Legacy CMS connectivity failure`, {
    code: issue.code,
    message: issue.message,
    configuredUrl: issue.configuredUrl,
  });
}

/** @deprecated Use logCmsConnectivityIssue */
export const logStrapiConnectivityIssue = logCmsConnectivityIssue;

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
const EXPECTED_PRODUCTION_CMS_URL = "https://be.ctrl-assess.co.uk/api";

export function getConfiguredCmsApiUrl() {
  return getCmsApiBaseUrl();
}

/** @deprecated Use getConfiguredCmsApiUrl */
export const getConfiguredStrapiApiUrl = getConfiguredCmsApiUrl;

function resolveCmsHost(apiUrl: string) {
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

function isPrivateHost(hostname: string) {
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

export function diagnoseCmsConnectivity(
  configuredUrl = getConfiguredCmsApiUrl(),
): CmsConnectivityIssue | null {
  if (!configuredUrl?.trim()) {
    return {
      code: "missing",
      message: "Legacy CMS API URL is not configured.",
    };
  }

  const hostname = resolveCmsHost(configuredUrl);
  if (!hostname) {
    return {
      code: "missing",
      message: "Legacy CMS API URL is invalid.",
      configuredUrl,
    };
  }

  if (isPrivateHost(hostname)) {
    return {
      code: "private",
      message: `Legacy CMS URL resolves to a private host (${hostname}).`,
      configuredUrl,
    };
  }

  if (KNOWN_FRONTEND_HOSTS.has(hostname)) {
    return {
      code: "frontend",
      message: `Legacy CMS URL points at the frontend host (${hostname}). Expected ${EXPECTED_PRODUCTION_CMS_URL}.`,
      configuredUrl,
    };
  }

  return null;
}

/** @deprecated Use diagnoseCmsConnectivity */
export const diagnoseStrapiConnectivity = diagnoseCmsConnectivity;

export async function checkCmsReachability(
  configuredUrl = getConfiguredCmsApiUrl(),
): Promise<CmsConnectivityIssue | null> {
  const configIssue = diagnoseCmsConnectivity(configuredUrl);
  if (configIssue) return configIssue;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CMS_HEALTH_TIMEOUT_MS);
  try {
    const healthUrl = configuredUrl.replace(/\/api\/?$/, "") + "/_health";
    const response = await fetch(healthUrl, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok && response.status >= 500) {
      return {
        code: "unreachable",
        message: `Legacy CMS health check failed with ${response.status}.`,
        configuredUrl,
      };
    }
    return null;
  } catch (error) {
    return {
      code: "unreachable",
      message:
        error instanceof Error
          ? error.message
          : "Legacy CMS health check failed.",
      configuredUrl,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** @deprecated Use checkCmsReachability */
export const checkStrapiReachability = checkCmsReachability;

export type { CmsConnectivityIssue as StrapiConnectivityIssue };

export function isFetchTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "TimeoutError" ||
    error.name === "AbortError" ||
    /aborted|timeout/i.test(error.message)
  );
}

/**
 * Serverless-safe URL validation used by health routes and unit tests.
 * Prefers explicit production URL messaging for Vercel misconfig.
 */
export function validateCmsApiUrlForServerless(
  configuredUrl = getConfiguredCmsApiUrl(),
): CmsConnectivityIssue | null {
  if (!configuredUrl?.trim()) {
    return {
      code: "missing",
      message:
        "STRAPI_API_URL is not set. On Vercel set STRAPI_API_URL=https://be.ctrl-assess.co.uk/api",
    };
  }

  let apiUrl: URL;
  try {
    apiUrl = new URL(configuredUrl);
  } catch {
    return {
      code: "missing",
      message: `STRAPI_API_URL is not a valid URL: ${configuredUrl}`,
      configuredUrl,
    };
  }

  const hostname = apiUrl.hostname;
  if (KNOWN_FRONTEND_HOSTS.has(hostname) || hostname.endsWith(".vercel.app")) {
    const vercelFrontend =
      process.env.VERCEL_URL &&
      hostname === process.env.VERCEL_URL.replace(/^https?:\/\//, "");
    if (KNOWN_FRONTEND_HOSTS.has(hostname) || vercelFrontend) {
      return {
        code: "frontend",
        message: `STRAPI_API_URL points at the frontend app (${apiUrl}). Set STRAPI_API_URL=${EXPECTED_PRODUCTION_CMS_URL}; do not use https://www.ctrl-assess.co.uk/api because frontend /api/auth routes are handled by NextAuth, not Strapi.`,
        configuredUrl,
      };
    }
  }

  if (isPrivateHost(hostname)) {
    return {
      code: "private",
      message: `STRAPI_API_URL points to a private/local host (${hostname}) that Vercel cannot reach. Use the public backend URL: ${EXPECTED_PRODUCTION_CMS_URL}`,
      configuredUrl,
    };
  }

  return null;
}

/** @deprecated Use validateCmsApiUrlForServerless */
export const validateStrapiApiUrlForServerless = validateCmsApiUrlForServerless;
