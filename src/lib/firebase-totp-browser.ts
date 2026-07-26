"use client";

import { FirebaseError } from "firebase/app";
import {
  confirmPasswordReset,
  getMultiFactorResolver,
  inMemoryPersistence,
  multiFactor,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  TotpMultiFactorGenerator,
  updatePassword,
  type MultiFactorError,
  type TotpSecret,
  type User,
} from "firebase/auth";

import { getFirebaseBrowserAuth } from "@/lib/firebase-client";

export type FirebaseTotpStatus = Readonly<{
  totpEnabled: boolean;
  enrolledFactorId?: string;
  recovery: "administrator-assisted";
}>;

export type FirebaseTotpEnrollment = Readonly<{
  secretKey: string;
  authenticatorUri: string;
}>;

export type AuthenticatorUnlockCode =
  | "totp_required"
  | "invalid_credentials"
  | "generic";

export class AuthenticatorUnlockError extends Error {
  readonly code: AuthenticatorUnlockCode;

  constructor(message: string, code: AuthenticatorUnlockCode) {
    super(message);
    this.name = "AuthenticatorUnlockError";
    this.code = code;
  }
}

let pendingTotpSecret: TotpSecret | null = null;

export function hasAuthenticatorBrowserSession(): boolean {
  return Boolean(getFirebaseBrowserAuth().currentUser);
}

function requireCurrentFirebaseUser(): User {
  const user = getFirebaseBrowserAuth().currentUser;
  if (!user) {
    throw new Error(
      "Confirm your password below to manage your authenticator.",
    );
  }
  return user;
}

function currentTotpFactor(user: User) {
  return multiFactor(user).enrolledFactors.find(
    (factor) => factor.factorId === TotpMultiFactorGenerator.FACTOR_ID,
  );
}

export function getFirebaseTotpStatus(): FirebaseTotpStatus {
  const factor = currentTotpFactor(requireCurrentFirebaseUser());
  return {
    totpEnabled: Boolean(factor),
    enrolledFactorId: factor?.uid,
    recovery: "administrator-assisted",
  };
}

/**
 * Restores an in-memory Auth user so MFA enroll/unenroll can run.
 * Does not rewrite the CTRL httpOnly session cookie.
 */
export async function unlockAuthenticatorManagement(input: {
  email: string;
  password: string;
  totpCode?: string;
}): Promise<FirebaseTotpStatus> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  if (!email || !password) {
    throw new AuthenticatorUnlockError(
      "Enter your email and password to continue.",
      "generic",
    );
  }

  const auth = getFirebaseBrowserAuth();
  await setPersistence(auth, inMemoryPersistence);

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    if (
      error instanceof FirebaseError &&
      error.code === "auth/multi-factor-auth-required"
    ) {
      const code = input.totpCode?.trim() ?? "";
      if (!code) {
        throw new AuthenticatorUnlockError(
          "Enter the six-digit code from your authenticator app.",
          "totp_required",
        );
      }
      const resolver = getMultiFactorResolver(auth, error as MultiFactorError);
      const totpHint = resolver.hints.find(
        (hint) => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID,
      );
      if (!totpHint) {
        throw new AuthenticatorUnlockError(
          "Authenticator challenge is unavailable for this account.",
          "generic",
        );
      }
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(
        totpHint.uid,
        code,
      );
      await resolver.resolveSignIn(assertion);
    } else if (
      error instanceof FirebaseError &&
      (error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/invalid-email")
    ) {
      throw new AuthenticatorUnlockError(
        "Email or password is incorrect.",
        "invalid_credentials",
      );
    } else {
      throw error instanceof Error
        ? error
        : new AuthenticatorUnlockError(
            "Could not confirm your identity. Try again.",
            "generic",
          );
    }
  }

  return getFirebaseTotpStatus();
}

export async function beginFirebaseTotpEnrollment(input?: {
  accountName?: string;
  issuer?: string;
}): Promise<FirebaseTotpEnrollment> {
  const user = requireCurrentFirebaseUser();
  if (currentTotpFactor(user)) {
    throw new Error("An authenticator is already enrolled");
  }
  const session = await multiFactor(user).getSession();
  pendingTotpSecret = await TotpMultiFactorGenerator.generateSecret(session);
  const accountName = input?.accountName ?? user.email ?? "CTRL Assess account";
  return {
    secretKey: pendingTotpSecret.secretKey,
    authenticatorUri: pendingTotpSecret.generateQrCodeUrl(
      accountName,
      input?.issuer ?? "CTRL Assess",
    ),
  };
}

export async function completeFirebaseTotpEnrollment(
  verificationCode: string,
  options?: { signOutAfter?: boolean },
): Promise<{ requiresFreshMfaSignIn: boolean }> {
  const user = requireCurrentFirebaseUser();
  const secret = pendingTotpSecret;
  if (!secret) {
    throw new Error("Authenticator setup has expired. Start again.");
  }
  const assertion = TotpMultiFactorGenerator.assertionForEnrollment(
    secret,
    verificationCode.trim(),
  );
  await multiFactor(user).enroll(assertion, "Authenticator app");
  pendingTotpSecret = null;

  const signOutAfter = options?.signOutAfter !== false;
  if (signOutAfter) {
    // Enrollment alone does not create `firebase.sign_in_second_factor`.
    // Requiring a new MFA sign-in gives bootstrap a genuine second-factor claim.
    await signOut(getFirebaseBrowserAuth());
  }
  return { requiresFreshMfaSignIn: signOutAfter };
}

export async function updateFirebaseAccountPassword(
  newPassword: string,
): Promise<void> {
  const password = newPassword.trim();
  if (password.length < 8) {
    throw new Error("Use a password with at least 8 characters");
  }
  await updatePassword(requireCurrentFirebaseUser(), password);
}

export async function disableFirebaseTotp(): Promise<void> {
  const user = requireCurrentFirebaseUser();
  const factor = currentTotpFactor(user);
  if (!factor) return;
  await multiFactor(user).unenroll(factor);
}

/**
 * Password recovery does not bypass MFA. A user who has lost the
 * enrolled factor still requires administrator-assisted recovery; this only
 * initiates password recovery.
 */
export async function sendFirebasePasswordRecovery(
  email: string,
): Promise<void> {
  await sendPasswordResetEmail(
    getFirebaseBrowserAuth(),
    email.trim().toLowerCase(),
  );
}

export async function confirmFirebasePasswordRecovery(
  actionCode: string,
  newPassword: string,
): Promise<void> {
  await confirmPasswordReset(
    getFirebaseBrowserAuth(),
    actionCode.trim(),
    newPassword,
  );
}
