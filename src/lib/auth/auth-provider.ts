/** Firebase is the sole supported identity provider. */
export function isFirebaseAuthProvider(): boolean {
  return true;
}

export const FIREBASE_AUTH_ROUTE_GONE_MESSAGE =
  "This sign-in endpoint is no longer available. Sign in from the CTRL login page instead.";
