import "server-only";

/**
 * Proves the password against Identity Toolkit without completing MFA.
 * A pending second-factor response means the password was accepted.
 */
export async function firebasePasswordAccepted(input: {
  email: string;
  password: string;
}): Promise<boolean> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Firebase API key is not configured");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        email: input.email.trim().toLowerCase(),
        password: input.password,
        returnSecureToken: true,
      }),
      cache: "no-store",
    },
  );

  const body = (await response.json().catch(() => ({}))) as {
    idToken?: string;
    mfaPendingCredential?: string;
    error?: { message?: string };
  };

  if (typeof body.mfaPendingCredential === "string" && body.mfaPendingCredential.length > 0) {
    return true;
  }
  if (typeof body.idToken === "string" && body.idToken.length > 0) {
    return true;
  }

  const message = body.error?.message ?? "";
  if (
    message.includes("SECOND_FACTOR") ||
    message.includes("MFA") ||
    message.includes("MULTI_FACTOR")
  ) {
    return true;
  }

  return false;
}
