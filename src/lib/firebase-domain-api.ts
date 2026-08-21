import "server-only";

import { getVercelOidcToken } from "@vercel/oidc";
import {
  IdentityPoolClient,
  Impersonated,
  type SubjectTokenSupplier,
} from "google-auth-library";

import { createCloudRunBffClient } from "@/lib/cloud-run-bff-client";
import type {
  AdministratorBootstrapRequest,
  AdministratorBootstrapResponse,
  AdministratorBootstrapStatusResponse,
  InvitationAcceptanceRequest,
  InvitationAcceptanceResponse,
  CandidateInvitationAcceptanceResponse,
  FirebaseAccountProvisioningRequest,
  FirebaseAccountProvisioningResponse,
  SessionAccessCodeClaimRequest,
  SessionAccessCodeClaimResponse,
} from "@/lib/firebase-provisioning-contracts";

export type FirebaseDomainUserContext = Readonly<{
  userId: string;
  firebaseUid: string;
  accountStatus: "active" | "suspended" | "closed";
  portalRole: "candidate" | "hiring_manager" | "client" | "admin";
  displayName?: string;
  email?: string;
  organizationId?: string;
  seatId?: string;
  platformRoles?: ReadonlyArray<
    "super_admin" | "support_admin" | "billing_admin" | "operations_admin"
  >;
  secondFactorSatisfied?: boolean;
  permissions: readonly string[];
}>;

export type FirebaseDomainSessionExchange = Readonly<{
  sessionCookie: string;
  expiresInMilliseconds: number;
  secondFactorSatisfied: boolean;
}>;

export type FirebaseInPersonCandidateCustomToken = Readonly<{
  customToken: string;
}>;

type FirebaseDomainEnvironment = Readonly<{
  baseUrl: string;
  workloadIdentityProvider: string;
  invokerServiceAccount: string;
}>;

function requiredServerEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required domain API configuration: ${name}`);
  }
  return value;
}

export function getFirebaseDomainEnvironment(): FirebaseDomainEnvironment {
  const configuredBaseUrl =
    process.env.DOMAIN_API_URL?.trim() ||
    process.env.FIREBASE_DOMAIN_API_URL?.trim();
  if (!configuredBaseUrl) {
    throw new Error(
      "Missing required domain API configuration: DOMAIN_API_URL",
    );
  }
  const baseUrl = configuredBaseUrl.replace(/\/$/, "");
  const workloadIdentityProvider = requiredServerEnvironment(
    "GOOGLE_WORKLOAD_IDENTITY_PROVIDER",
  );
  const invokerServiceAccount = requiredServerEnvironment(
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  );

  if (!baseUrl.startsWith("https://") && !baseUrl.startsWith("http://localhost")) {
    throw new Error("DOMAIN_API_URL must use HTTPS");
  }
  if (
    !workloadIdentityProvider.startsWith(
      "//iam.googleapis.com/projects/",
    )
  ) {
    throw new Error("GOOGLE_WORKLOAD_IDENTITY_PROVIDER is not a provider resource name");
  }
  if (!invokerServiceAccount.endsWith(".gserviceaccount.com")) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL is not a service-account email");
  }

  return { baseUrl, workloadIdentityProvider, invokerServiceAccount };
}

/**
 * The supplier intentionally resolves the Vercel token at request time. Vercel
 * rotates it and exposes it through request context in Functions (or
 * VERCEL_OIDC_TOKEN during local development).
 */
class VercelSubjectTokenSupplier implements SubjectTokenSupplier {
  async getSubjectToken(): Promise<string> {
    return getVercelOidcToken();
  }
}

/**
 * Impersonated ID tokens live for 600s. Reusing one for a shorter window means
 * a warm Vercel Function pays one STS exchange plus one IAM impersonation per
 * window instead of two extra Google round trips on every domain API call.
 */
const IDENTITY_TOKEN_CACHE_TTL_MS = 300_000;

export function createCachedIdentityTokenProvider(
  provider: (audience: string) => Promise<string>,
  options: { ttlMs?: number; now?: () => number } = {},
): (audience: string) => Promise<string> {
  const ttlMs = options.ttlMs ?? IDENTITY_TOKEN_CACHE_TTL_MS;
  const now = options.now ?? (() => Date.now());
  const cache = new Map<string, { token: string; expiresAt: number }>();
  const inFlight = new Map<string, Promise<string>>();

  return async (audience) => {
    const cached = cache.get(audience);
    if (cached && cached.expiresAt > now()) {
      return cached.token;
    }
    const pending = inFlight.get(audience);
    if (pending) {
      return pending;
    }
    // Only a successful mint is cached; a rejection rejects every waiter and
    // leaves the next call to retry against Google.
    const load = (async () => {
      try {
        const token = await provider(audience);
        cache.set(audience, { token, expiresAt: now() + ttlMs });
        return token;
      } finally {
        inFlight.delete(audience);
      }
    })();
    inFlight.set(audience, load);
    return load;
  };
}

function createGoogleIdentityTokenProvider(
  environment: FirebaseDomainEnvironment,
): (audience: string) => Promise<string> {
  const federatedClient = new IdentityPoolClient({
    audience: environment.workloadIdentityProvider,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    subject_token_supplier: new VercelSubjectTokenSupplier(),
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const impersonatedClient = new Impersonated({
    sourceClient: federatedClient,
    targetPrincipal: environment.invokerServiceAccount,
    targetScopes: ["https://www.googleapis.com/auth/cloud-platform"],
    lifetime: 600,
  });

  return (audience) =>
    impersonatedClient.fetchIdToken(audience, { includeEmail: true });
}

/**
 * The domain API factory runs per request, so both the Google clients and
 * the token cache are held at module scope and keyed by the identity they were
 * built from. Nothing user-scoped is cached here.
 */
const identityTokenProviders = new Map<
  string,
  (audience: string) => Promise<string>
>();

function getIdentityTokenProvider(
  environment: FirebaseDomainEnvironment,
): (audience: string) => Promise<string> {
  const key = `${environment.workloadIdentityProvider}\u001f${environment.invokerServiceAccount}`;
  let provider = identityTokenProviders.get(key);
  if (!provider) {
    provider = createCachedIdentityTokenProvider(
      createGoogleIdentityTokenProvider(environment),
    );
    identityTokenProviders.set(key, provider);
  }
  return provider;
}

export function createFirebaseDomainApi(
  environment = getFirebaseDomainEnvironment(),
) {
  const transport = createCloudRunBffClient({
    baseUrl: environment.baseUrl,
    getIdentityToken: getIdentityTokenProvider(environment),
  });

  return {
    exchangeSession(idToken: string): Promise<FirebaseDomainSessionExchange> {
      return transport.request({
        path: "/v1/auth/session-exchange",
        method: "POST",
        body: { idToken },
      });
    },

    issueInPersonCandidateCustomToken(body: {
      email: string;
      accessCode?: string;
    }): Promise<FirebaseInPersonCandidateCustomToken> {
      return transport.request({
        path: "/v1/auth/in-person-candidate-custom-token",
        method: "POST",
        body,
      });
    },

    getUserContext(
      firebaseSessionCookie: string,
      options?: { sensitive?: boolean },
    ): Promise<FirebaseDomainUserContext> {
      return transport.request({
        path: options?.sensitive ? "/v1/sensitive/me" : "/v1/me",
        firebaseSessionCookie,
      });
    },

    getAdministratorBootstrapStatus(
      firebaseSessionCookie: string,
    ): Promise<AdministratorBootstrapStatusResponse> {
      return transport.request({
        path: "/v1/bootstrap/status",
        firebaseSessionCookie,
      });
    },

    bootstrapAdministrator(
      firebaseSessionCookie: string,
      body: AdministratorBootstrapRequest,
    ): Promise<AdministratorBootstrapResponse> {
      return transport.request({
        path: "/v1/bootstrap/administrator",
        method: "POST",
        firebaseSessionCookie,
        body,
      });
    },

    acceptInvitation(
      firebaseSessionCookie: string,
      body: InvitationAcceptanceRequest,
    ): Promise<InvitationAcceptanceResponse> {
      return transport.request({
        path: "/v1/invitations/accept",
        method: "POST",
        firebaseSessionCookie,
        body,
      });
    },

    acceptCandidateInvitation(
      firebaseSessionCookie: string,
      body: InvitationAcceptanceRequest,
    ): Promise<CandidateInvitationAcceptanceResponse> {
      return transport.request({
        path: "/v1/assignments/invitations/accept",
        method: "POST",
        firebaseSessionCookie,
        body,
      });
    },

    claimSessionAccessCode(
      firebaseSessionCookie: string,
      body: SessionAccessCodeClaimRequest,
    ): Promise<SessionAccessCodeClaimResponse> {
      return transport.request({
        path: "/v1/sessions/access-code/claim",
        method: "POST",
        firebaseSessionCookie,
        body,
      });
    },

    provisionFirebaseAccount(
      body: FirebaseAccountProvisioningRequest,
    ): Promise<FirebaseAccountProvisioningResponse> {
      return transport.request({
        path: "/v1/onboarding/firebase-account",
        method: "POST",
        body,
      });
    },

    provisionCandidateAccount(
      body: FirebaseAccountProvisioningRequest,
    ): Promise<FirebaseAccountProvisioningResponse> {
      return transport.request({
        path: "/v1/onboarding/candidate-account",
        method: "POST",
        body,
      });
    },

    logout(firebaseSessionCookie: string): Promise<void> {
      return transport.request({
        path: "/v1/auth/logout",
        method: "POST",
        firebaseSessionCookie,
      });
    },

    request<ResponseBody>(request: {
      path: `/${string}`;
      firebaseSessionCookie?: string;
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      body?: unknown;
      headers?: Readonly<Record<string, string>>;
      signal?: AbortSignal;
    }): Promise<ResponseBody> {
      return transport.request<ResponseBody>(request);
    },
  };
}
