/** Firebase is the sole supported identity provider. */
export function isFirebaseAuthProvider(): boolean {
  return true;
}

export const FIREBASE_AUTH_ROUTE_GONE_MESSAGE =
  "This credential endpoint is retired on the Firebase auth path. Use Firebase Auth in the browser (session cookie exchange, password recovery, and authenticator enrolment).";
