import "server-only";

/**
 * Persistence-neutral entry point for the private application API.
 *
 * Firebase remains the identity provider, but callers must not depend on the
 * database used by the private API. The compatibility adapter can therefore
 * move from Firestore to PostgreSQL without changing browser or BFF routes.
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
