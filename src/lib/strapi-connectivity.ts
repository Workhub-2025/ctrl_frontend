import "server-only";

/**
 * Compatibility shim — prefer `@/legacy-cms/connectivity`.
 */
export {
  PUBLIC_CMS_UNAVAILABLE_MESSAGE,
  PUBLIC_STRAPI_UNAVAILABLE_MESSAGE,
  getConfiguredCmsApiUrl,
  getConfiguredStrapiApiUrl,
  diagnoseCmsConnectivity,
  diagnoseStrapiConnectivity,
  checkCmsReachability,
  checkStrapiReachability,
  logCmsConnectivityIssue,
  logStrapiConnectivityIssue,
  isFetchTimeoutError,
  validateCmsApiUrlForServerless,
  validateStrapiApiUrlForServerless,
  type CmsConnectivityIssue,
  type StrapiConnectivityIssue,
} from "@/legacy-cms/connectivity";
