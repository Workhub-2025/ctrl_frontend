/**
 * Quarantined legacy CMS (Strapi) URL helpers for production dual-path only.
 * Firebase Preview must not call these at runtime.
 *
 * Intentionally isomorphic (no `server-only`) so shared fetch helpers used by
 * client portal code can resolve the legacy API base without bundling errors.
 */

export const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, "");
export const stripLeadingSlashes = (value: string) => value.replace(/^\/+/, "");

/** Server-side legacy CMS REST base URL (includes `/api`). */
export function getCmsApiBaseUrl() {
  const baseUrl = stripTrailingSlashes(
    process.env.STRAPI_API_URL ??
      process.env.NEXT_PUBLIC_STRAPI_API_URL ??
      "http://localhost:1337/api",
  );

  return baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;
}

/** Legacy CMS host root without `/api` — for public media URLs. */
export function getCmsPublicBaseUrl() {
  const apiBase = getCmsApiBaseUrl();
  return stripTrailingSlashes(apiBase.replace(/\/api$/, ""));
}

export function joinCmsApiPath(baseUrl: string, path: string) {
  return `${stripTrailingSlashes(baseUrl)}/${stripLeadingSlashes(path)}`;
}

/** @deprecated Use getCmsApiBaseUrl */
export const getStrapiApiBaseUrl = getCmsApiBaseUrl;
/** @deprecated Use joinCmsApiPath */
export const joinStrapiApiPath = joinCmsApiPath;
/** @deprecated Use getCmsPublicBaseUrl */
export const getStrapiPublicBaseUrl = getCmsPublicBaseUrl;
