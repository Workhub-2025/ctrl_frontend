export const FIREBASE_SESSION_COOKIE_NAME = "__Host-ctrl_session";
export const FIREBASE_SESSION_CSRF_COOKIE_NAME = "__Host-ctrl_session_csrf";
export const FIREBASE_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;
export const FIREBASE_RECENT_AUTH_MAX_AGE_SECONDS = 5 * 60;
export const FIREBASE_SESSION_CSRF_MAX_AGE_SECONDS = 5 * 60;

export type FirebaseSessionExchangeRequest = Readonly<{
  idToken: string;
  csrfToken: string;
  intent?: "invitation_acceptance" | "session_access_code_claim";
}>;

export type FirebaseSessionExchangeResponse = Readonly<{
  expiresAt: string;
  user: Readonly<{
    userId: string;
    portalRole: "candidate" | "hiring_manager" | "client" | "admin";
    /** Scoped admin portal role when portalRole is admin (e.g. admin_billing). */
    role?: string;
    organizationId?: string;
  }>;
}>;

export type FirebaseProvisioningSessionExchangeResponse = Readonly<{
  expiresAt: string;
  provisioningRequired: true;
  bootstrapStatus?: "not_staged" | "pending" | "completed";
  redirectPath: "/auth/bootstrap" | "/auth/accept-invitation" | "/join";
}>;

export type FirebaseSessionCookiePolicy = Readonly<{
  name: typeof FIREBASE_SESSION_COOKIE_NAME;
  httpOnly: true;
  secure: true;
  sameSite: "lax";
  path: "/";
  maxAge: number;
}>;

export const FIREBASE_SESSION_COOKIE_POLICY: FirebaseSessionCookiePolicy = {
  name: FIREBASE_SESSION_COOKIE_NAME,
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: FIREBASE_SESSION_MAX_AGE_SECONDS,
};

export type FirebaseSessionCsrfResponse = Readonly<{
  csrfToken: string;
}>;

/**
 * The exchange handler must validate a matching CSRF cookie, require a recent
 * Firebase `auth_time`, and create the Admin SDK session cookie. Cloud Run
 * returns the cookie only to the trusted Vercel BFF, which writes it using the
 * policy below and returns a sanitized FirebaseSessionExchangeResponse.
 * Sensitive
 * handlers verify with revocation checking enabled (`verifySessionCookie(...,
 * true)`). The ID token is exchanged once and is never persisted in browser
 * storage by this contract.
 */
export function isRecentFirebaseAuthentication(
  authTimeSeconds: number,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const age = nowSeconds - authTimeSeconds;
  return age >= 0 && age <= FIREBASE_RECENT_AUTH_MAX_AGE_SECONDS;
}
