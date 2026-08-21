import "server-only";

/**
 * Entry point for the private application API.
 *
 * Firebase authenticates the session. Product data stays behind the domain API.
 */
export {
  createFirebaseDomainApi as createDomainApi,
  createCachedIdentityTokenProvider,
  getFirebaseDomainEnvironment as getDomainApiEnvironment,
} from "@/lib/firebase-domain-api";

export type {
  FirebaseDomainSessionExchange as DomainSessionExchange,
  FirebaseDomainUserContext as DomainUserContext,
} from "@/lib/firebase-domain-api";
