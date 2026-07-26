"use client";

import {
  confirmPasswordReset,
  TotpMultiFactorGenerator,
  multiFactor,
  sendPasswordResetEmail,
  signOut,
  updatePassword,
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

let pendingTotpSecret: TotpSecret | null = null;

function requireCurrentFirebaseUser(): User {
  const user = getFirebaseBrowserAuth().currentUser;
  if (!user) {
    throw new Error("Sign in with Firebase again to manage your authenticator");
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
 * Password recovery does not bypass Firebase MFA. A user who has lost the
 * enrolled factor still requires the separately controlled administrator
 * recovery workflow; this only initiates Firebase password recovery.
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
