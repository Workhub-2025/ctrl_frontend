import "server-only";

/**
 * Compatibility shim — prefer `@/legacy-cms/public-auth`.
 */
export { postCmsAuth } from "@/legacy-cms/public-auth";

/** @deprecated Use postCmsAuth */
export { postCmsAuth as postStrapiAuth } from "@/legacy-cms/public-auth";
