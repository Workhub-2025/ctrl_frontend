function stripTrailingSlashes(value: string) {
  return value.replace(/\/+$/, "");
}

function getStrapiApiUrl() {
  return stripTrailingSlashes(
    process.env.STRAPI_API_URL ??
      process.env.NEXT_PUBLIC_STRAPI_API_URL ??
      "http://localhost:1337/api"
  );
}

function getOriginFromUrl(raw: string): string | null {
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function getStrapiOrigin() {
  return getOriginFromUrl(getStrapiApiUrl()) ?? "http://localhost:1337";
}

/** Builds a production Content-Security-Policy header value. */
export function buildContentSecurityPolicy(): string {
  const strapiOrigin = getStrapiOrigin();

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "img-src": ["'self'", "data:", "blob:", strapiOrigin, "https://placehold.co"],
    "media-src": ["'self'", "blob:", strapiOrigin],
    "font-src": ["'self'", "data:"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com"],
    "connect-src": [
      "'self'",
      strapiOrigin,
      "https://api.stripe.com",
    ],
    "frame-src": ["'self'", "https://js.stripe.com", "https://checkout.stripe.com"],
    "upgrade-insecure-requests": [],
  };

  return Object.entries(directives)
    .map(([name, values]) =>
      values.length > 0 ? `${name} ${values.join(" ")}` : name
    )
    .join("; ");
}
