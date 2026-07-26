import { isFirebaseAuthProvider } from "@/lib/auth/auth-provider";
import { getCmsApiBaseUrl } from "@/legacy-cms/server-url";

function getOriginFromUrl(raw: string): string | null {
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function getLegacyCmsOrigin(): string | null {
  if (isFirebaseAuthProvider()) {
    return null;
  }
  return getOriginFromUrl(getCmsApiBaseUrl());
}

/** Vercel Preview injects the live feedback toolbar iframe from vercel.live. */
export function isVercelPreviewDeployment(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

/**
 * Browser Firebase Auth hosts used by the client SDK (email/password sign-in,
 * auth iframe, token refresh, optional reCAPTCHA/MFA challenges).
 * Keep this list tight: Firestore/Storage/Functions stay server-side via BFF.
 */
const FIREBASE_AUTH_CONNECT_SRC = [
  "https://identitytoolkit.googleapis.com",
  "https://securetoken.googleapis.com",
  "https://www.googleapis.com",
] as const;

const FIREBASE_AUTH_FRAME_SRC = [
  "https://*.firebaseapp.com",
  "https://*.google.com",
] as const;

const FIREBASE_AUTH_SCRIPT_SRC = [
  "https://www.gstatic.com",
  "https://apis.google.com",
] as const;

const FIREBASE_AUTH_IMG_SRC = ["https://www.gstatic.com"] as const;

/** Builds a production Content-Security-Policy header value. */
export function buildContentSecurityPolicy(nonce: string): string {
  const legacyCmsOrigin = getLegacyCmsOrigin();
  const allowVercelLiveFeedback = isVercelPreviewDeployment();
  const allowFirebaseAuth = isFirebaseAuthProvider();

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://placehold.co",
      ...(legacyCmsOrigin ? [legacyCmsOrigin] : []),
      ...(allowFirebaseAuth ? [...FIREBASE_AUTH_IMG_SRC] : []),
      ...(allowVercelLiveFeedback ? ["https://vercel.live"] : []),
    ],
    "media-src": ["'self'", "blob:", ...(legacyCmsOrigin ? [legacyCmsOrigin] : [])],
    "font-src": ["'self'", "data:"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      "https://js.stripe.com",
      ...(allowFirebaseAuth ? [...FIREBASE_AUTH_SCRIPT_SRC] : []),
      ...(allowVercelLiveFeedback ? ["https://vercel.live"] : []),
    ],
    "connect-src": [
      "'self'",
      "https://api.stripe.com",
      ...(legacyCmsOrigin ? [legacyCmsOrigin] : []),
      ...(allowFirebaseAuth ? [...FIREBASE_AUTH_CONNECT_SRC] : []),
      ...(allowVercelLiveFeedback
        ? ["https://vercel.live", "wss://vercel.live"]
        : []),
    ],
    "frame-src": [
      "'self'",
      "https://js.stripe.com",
      "https://checkout.stripe.com",
      ...(allowFirebaseAuth ? [...FIREBASE_AUTH_FRAME_SRC] : []),
      ...(allowVercelLiveFeedback ? ["https://vercel.live"] : []),
    ],
    "upgrade-insecure-requests": [],
  };

  return Object.entries(directives)
    .map(([name, values]) =>
      values.length > 0 ? `${name} ${values.join(" ")}` : name
    )
    .join("; ");
}
