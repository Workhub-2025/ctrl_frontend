import "server-only";

/**
 * Compatibility shim — prefer `@/legacy-cms/server-url`.
 */
export {
  stripTrailingSlashes,
  stripLeadingSlashes,
  getCmsApiBaseUrl,
  getCmsPublicBaseUrl,
  joinCmsApiPath,
  getStrapiApiBaseUrl,
  joinStrapiApiPath,
  getStrapiPublicBaseUrl,
} from "@/legacy-cms/server-url";
