import "server-only";

import { getStrapiApiBaseUrl, joinStrapiApiPath } from "@/lib/strapi-server";

export async function forwardAssessmentAttemptRequest(
  path: string,
  init: RequestInit,
  strapiJwt: string
) {
  const response = await fetch(joinStrapiApiPath(getStrapiApiBaseUrl(), path), {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${strapiJwt}`,
      ...init.headers,
    },
  });

  const body = await response.json().catch(() => ({}));
  return { response, body };
}
