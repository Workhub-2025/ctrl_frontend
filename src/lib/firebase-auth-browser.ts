"use client";

import { FirebaseError } from "firebase/app";
import {
  TotpMultiFactorGenerator,
  getMultiFactorResolver,
  inMemoryPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type MultiFactorError,
  type MultiFactorResolver,
  type UserCredential,
} from "firebase/auth";

import { getFirebaseBrowserAuth } from "@/lib/firebase-client";
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

let pendingTotpResolver: MultiFactorResolver | null = null;
let pendingProvisioningIntent: "invitation_acceptance" | undefined;

async function readJson<ResponseBody>(response: Response): Promise<ResponseBody> {
  return (await response.json().catch(() => ({}))) as ResponseBody;
}

export async function exchangeFirebaseIdTokenForSession(
  idToken: string,
  fetchImpl: typeof fetch = fetch,
  intent?: "invitation_acceptance",
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
  intent?: "invitation_acceptance",
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

export async function loginWithFirebase(
  email: string,
  password: string,
  options?: { provisioningIntent?: "invitation_acceptance" },
): Promise<FirebaseLoginResult> {
  const auth = getFirebaseBrowserAuth();
  // The ID token is only a bootstrap credential for the BFF exchange. Keep
  // Firebase browser state in memory so it is not written to localStorage or
  // IndexedDB; the durable session is the server-set httpOnly cookie.
  await setPersistence(auth, inMemoryPersistence);
  pendingTotpResolver = null;
  pendingProvisioningIntent = options?.provisioningIntent;

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password,
    );
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
