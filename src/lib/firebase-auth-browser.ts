"use client";

import { FirebaseError } from "firebase/app";
import {
  TotpMultiFactorGenerator,
  createUserWithEmailAndPassword,
  getMultiFactorResolver,
  inMemoryPersistence,
  sendEmailVerification,
  setPersistence,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type MultiFactorError,
  type MultiFactorResolver,
  type UserCredential,
} from "firebase/auth";

import { getFirebaseBrowserAuth } from "@/lib/firebase-client";
import {
  clearPendingSessionJoin,
  readPendingSessionJoin,
  storePendingSessionJoin,
} from "@/lib/pending-session-join";
import type {
  FirebaseSessionCsrfResponse,
  FirebaseProvisioningSessionExchangeResponse,
  FirebaseSessionExchangeResponse,
} from "@/lib/firebase-session-contracts";

export type FirebaseEstablishedSession =
  | (FirebaseSessionExchangeResponse & {
      redirectPath: string;
      provisioningRequired?: false;
    })
  | FirebaseProvisioningSessionExchangeResponse;

type FirebaseLoginResult =
  | Readonly<{ requiresTotp: true }>
  | Readonly<{
      requiresTotp: false;
      session: FirebaseEstablishedSession;
    }>;

export type FirebaseProvisioningIntent =
  | "invitation_acceptance"
  | "session_access_code_claim";

export type CandidateSessionJoinRegistration =
  | Readonly<{ status: "verification_required"; email: string }>
  | Readonly<{ status: "ready_to_claim"; email: string }>;

let pendingTotpResolver: MultiFactorResolver | null = null;
let pendingProvisioningIntent: FirebaseProvisioningIntent | undefined;

async function readJson<ResponseBody>(response: Response): Promise<ResponseBody> {
  return (await response.json().catch(() => ({}))) as ResponseBody;
}

export async function exchangeFirebaseIdTokenForSession(
  idToken: string,
  fetchImpl: typeof fetch = fetch,
  intent?: FirebaseProvisioningIntent,
): Promise<FirebaseEstablishedSession> {
  const csrfResponse = await fetchImpl("/api/auth/firebase/csrf", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const csrfBody = await readJson<FirebaseSessionCsrfResponse & { error?: string }>(
    csrfResponse,
  );
  if (!csrfResponse.ok || !csrfBody.csrfToken) {
    throw new Error(csrfBody.error ?? "Unable to initialize secure sign-in");
  }

  const exchangeResponse = await fetchImpl("/api/auth/firebase/session", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify({
      idToken,
      csrfToken: csrfBody.csrfToken,
      ...(intent ? { intent } : {}),
    }),
  });
  const exchangeBody = await readJson<{
    data?: FirebaseEstablishedSession;
    error?: string;
  }>(exchangeResponse);
  if (!exchangeResponse.ok || !exchangeBody.data) {
    throw new Error(exchangeBody.error ?? "Unable to establish your secure session");
  }

  return exchangeBody.data;
}

async function establishSession(
  credential: UserCredential,
  intent?: FirebaseProvisioningIntent,
): Promise<FirebaseLoginResult> {
  const idToken = await credential.user.getIdToken(true);
  const session = await exchangeFirebaseIdTokenForSession(
    idToken,
    fetch,
    intent,
  );
  pendingTotpResolver = null;
  pendingProvisioningIntent = undefined;
  return { requiresTotp: false, session };
}

async function signInWithInPersonMfaBypass(input: {
  email: string;
  password: string;
  accessCode?: string;
}): Promise<UserCredential | null> {
  const csrfResponse = await fetch("/api/auth/firebase/csrf", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const csrfBody = await readJson<FirebaseSessionCsrfResponse & { error?: string }>(
    csrfResponse,
  );
  if (!csrfResponse.ok || !csrfBody.csrfToken) {
    return null;
  }

  const bypassResponse = await fetch("/api/auth/firebase/in-person-mfa-bypass", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      csrfToken: csrfBody.csrfToken,
      ...(input.accessCode ? { accessCode: input.accessCode } : {}),
    }),
  });
  const bypassBody = await readJson<{
    data?: { customToken?: string };
  }>(bypassResponse);
  if (!bypassResponse.ok || !bypassBody.data?.customToken) {
    return null;
  }

  const auth = getFirebaseBrowserAuth();
  await setPersistence(auth, inMemoryPersistence);
  return signInWithCustomToken(auth, bypassBody.data.customToken);
}

function pendingJoinAccessCode(): string | undefined {
  return readPendingSessionJoin()?.accessCode;
}

async function signInPasswordOrInPersonBypass(input: {
  email: string;
  password: string;
  accessCode?: string;
}): Promise<UserCredential> {
  const auth = getFirebaseBrowserAuth();
  await setPersistence(auth, inMemoryPersistence);
  try {
    return await signInWithEmailAndPassword(
      auth,
      input.email.trim().toLowerCase(),
      input.password,
    );
  } catch (error) {
    if (
      !(error instanceof FirebaseError) ||
      error.code !== "auth/multi-factor-auth-required"
    ) {
      throw error;
    }
    const bypassCredential = await signInWithInPersonMfaBypass({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      accessCode: input.accessCode ?? pendingJoinAccessCode(),
    });
    if (!bypassCredential) {
      throw error;
    }
    return bypassCredential;
  }
}

export async function loginWithFirebase(
  email: string,
  password: string,
  options?: { provisioningIntent?: FirebaseProvisioningIntent },
): Promise<FirebaseLoginResult> {
  const auth = getFirebaseBrowserAuth();
  // The ID token is only a bootstrap credential for the BFF exchange. Keep
  // Firebase browser state in memory so it is not written to localStorage or
  // IndexedDB; the durable session is the server-set httpOnly cookie.
  await setPersistence(auth, inMemoryPersistence);
  pendingTotpResolver = null;
  pendingProvisioningIntent = options?.provisioningIntent;

  try {
    const credential = await signInPasswordOrInPersonBypass({
      email,
      password,
      accessCode: pendingJoinAccessCode(),
    });
    return establishSession(credential, options?.provisioningIntent);
  } catch (error) {
    if (
      error instanceof FirebaseError &&
      error.code === "auth/multi-factor-auth-required"
    ) {
      const resolver = getMultiFactorResolver(auth, error as MultiFactorError);
      const totpHint = resolver.hints.find(
        (hint) => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID,
      );
      if (!totpHint) {
        throw new Error("This account requires an unsupported second factor");
      }
      pendingTotpResolver = resolver;
      return { requiresTotp: true };
    }
    throw error;
  }
}

/**
 * Creates (or reuses) a durable Firebase email/password account for a
 * candidate joining via session access code. Email must be verified before
 * the BFF will exchange a session cookie.
 */
export async function registerCandidateSessionJoin(input: {
  accessCode: string;
  displayName: string;
  email: string;
  password: string;
}): Promise<CandidateSessionJoinRegistration> {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim().replace(/\s+/g, " ");
  storePendingSessionJoin({
    accessCode: input.accessCode,
    displayName,
    email,
  });

  const auth = getFirebaseBrowserAuth();
  await setPersistence(auth, inMemoryPersistence);

  let credential: UserCredential;
  try {
    credential = await createUserWithEmailAndPassword(
      auth,
      email,
      input.password,
    );
    if (displayName) {
      await updateProfile(credential.user, { displayName }).catch(() => undefined);
    }
  } catch (error) {
    if (
      !(error instanceof FirebaseError) ||
      error.code !== "auth/email-already-in-use"
    ) {
      clearPendingSessionJoin();
      throw error;
    }
    // Returning candidate — same durable credentials work for the rest of the day.
    credential = await signInPasswordOrInPersonBypass({
      email,
      password: input.password,
      accessCode: input.accessCode,
    });
  }

  await credential.user.reload();
  if (!credential.user.emailVerified) {
    const continueUrl = new URL("/join", window.location.origin);
    continueUrl.searchParams.set("accessCode", input.accessCode.trim());
    continueUrl.searchParams.set("verified", "1");
    await sendEmailVerification(credential.user, {
      url: continueUrl.toString(),
      handleCodeInApp: false,
    });
    return { status: "verification_required", email };
  }

  return { status: "ready_to_claim", email };
}

export async function resendCandidateJoinVerification(
  accessCode: string,
): Promise<void> {
  const auth = getFirebaseBrowserAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Sign in again to resend the verification email.");
  }
  await user.reload();
  if (user.emailVerified) return;
  const continueUrl = new URL("/join", window.location.origin);
  continueUrl.searchParams.set("accessCode", accessCode.trim());
  continueUrl.searchParams.set("verified", "1");
  await sendEmailVerification(user, {
    url: continueUrl.toString(),
    handleCodeInApp: false,
  });
}

/**
 * After email verification: exchange a provisioning session cookie, claim the
 * access code, and return the candidate dashboard path.
 */
export async function claimCandidateSessionJoin(input: {
  accessCode: string;
  displayName: string;
  password?: string;
  email?: string;
}): Promise<{ redirectPath: string }> {
  const auth = getFirebaseBrowserAuth();
  await setPersistence(auth, inMemoryPersistence);

  let user = auth.currentUser;
  if (!user && input.email && input.password) {
    const credential = await signInPasswordOrInPersonBypass({
      email: input.email,
      password: input.password,
      accessCode: input.accessCode,
    });
    user = credential.user;
  }
  if (!user) {
    throw new Error("Sign in with your email and password to continue.");
  }

  await user.reload();
  if (!user.emailVerified) {
    throw new Error(
      "Verify your email first — open the link we sent, then continue here.",
    );
  }

  const idToken = await user.getIdToken(true);
  await exchangeFirebaseIdTokenForSession(
    idToken,
    fetch,
    "session_access_code_claim",
  );

  return claimSessionAccessCodeWithCookie({
    accessCode: input.accessCode,
    displayName: input.displayName,
  });
}

/** Claims a session code using an already-established Firebase session cookie. */
export async function claimSessionAccessCodeWithCookie(input: {
  accessCode: string;
  displayName: string;
}): Promise<{ redirectPath: string }> {
  const idempotencyKey =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `claim-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const response = await fetch("/api/sessions/access-code/claim", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify({
      accessCode: input.accessCode,
      displayName: input.displayName,
      idempotencyKey,
    }),
  });
  const body = await readJson<{
    data?: { redirectPath?: string };
    error?: string;
  }>(response);
  if (!response.ok || !body.data?.redirectPath) {
    throw new Error(body.error ?? "Could not join this assessment session");
  }

  clearPendingSessionJoin();
  return { redirectPath: body.data.redirectPath };
}

export async function completeFirebaseTotpLogin(
  verificationCode: string,
): Promise<FirebaseLoginResult> {
  const resolver = pendingTotpResolver;
  if (!resolver) {
    throw new Error("Your sign-in verification has expired. Please sign in again.");
  }
  const totpHint = resolver.hints.find(
    (hint) => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID,
  );
  if (!totpHint) {
    pendingTotpResolver = null;
    throw new Error("No authenticator-app factor is available");
  }

  const assertion = TotpMultiFactorGenerator.assertionForSignIn(
    totpHint.uid,
    verificationCode.trim(),
  );
  const credential = await resolver.resolveSignIn(assertion);
  return establishSession(credential, pendingProvisioningIntent);
}

export async function logoutFirebaseBrowserSession(): Promise<void> {
  pendingTotpResolver = null;
  pendingProvisioningIntent = undefined;
  await signOut(getFirebaseBrowserAuth()).catch(() => undefined);
}
