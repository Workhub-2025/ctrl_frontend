import "server-only";

/**
 * Compatibility shim — prefer `@/legacy-cms/auth-server`.
 */
export {
  loginWithStrapiCredentials,
  registerWithCms,
} from "@/legacy-cms/auth-server";

/** @deprecated Use registerWithCms */
export { registerWithCms as registerWithStrapi } from "@/legacy-cms/auth-server";
