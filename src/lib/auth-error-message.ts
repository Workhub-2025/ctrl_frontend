import { FirebaseError } from "firebase/app";

/**
 * User-facing text for sign-in and account errors. The identity provider is
 * an implementation detail: its name and raw error codes never reach users.
 */
export function friendlyAuthError(error: unknown, fallback: string): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Email or password is incorrect.";
      case "auth/weak-password":
        return "Choose a stronger password (at least 12 characters).";
      case "auth/too-many-requests":
        return "Too many attempts. Wait a moment and try again.";
      case "auth/network-request-failed":
        return "We couldn't connect. Check your connection and try again.";
      case "auth/user-disabled":
        return "This account is disabled. Contact your hiring team or CTRL support.";
      default:
        return fallback;
    }
  }
  if (error instanceof Error && !/firebase/i.test(error.message)) {
    return error.message;
  }
  return fallback;
}
