import "server-only";

export const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, "");
export const stripLeadingSlashes = (value: string) => value.replace(/^\/+/, "");

/** Server-side Strapi REST base URL (includes `/api`). */
export function getStrapiApiBaseUrl() {
  return stripTrailingSlashes(
    process.env.STRAPI_API_URL ??
      process.env.NEXT_PUBLIC_STRAPI_API_URL ??
      "http://localhost:1337/api"
  );
}

/** Strapi host root without `/api` — for public media URLs. */
export function getStrapiPublicBaseUrl() {
  const apiBase = getStrapiApiBaseUrl();
  return stripTrailingSlashes(apiBase.replace(/\/api$/, ""));
}

export function joinStrapiApiPath(baseUrl: string, path: string) {
  return `${stripTrailingSlashes(baseUrl)}/${stripLeadingSlashes(path)}`;
}
