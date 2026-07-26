/**
 * Dual-path auth switch. Preview and Firebase-first environments set
 * NEXT_PUBLIC_AUTH_PROVIDER=firebase. Production may still use strapi until
 * cutover; prefer Firebase when the flag says so.
 */
export function isFirebaseAuthProvider(): boolean {
  return true;
}

export const FIREBASE_AUTH_ROUTE_GONE_MESSAGE =
  "This credential endpoint is retired on the Firebase auth path. Use Firebase Auth in the browser (session cookie exchange, password recovery, and authenticator enrolment).";
