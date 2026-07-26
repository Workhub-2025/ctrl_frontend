import "server-only";

import { postCmsAuth } from "@/legacy-cms/public-auth";
import { getCmsApiBaseUrl, joinCmsApiPath } from "@/legacy-cms/server-url";
import type { LoginUserData, StrapiAuthResponse } from "@/types/users.types";

const STRAPI_ROLE_LOOKUP_TIMEOUT_MS = 10_000;

const getServerApiToken = () =>
  process.env.STRAPI_API_FULL_ACCESS_TOKEN ||
  process.env.STRAPI_API_FULL_ACCCESS_TOKEN ||
  process.env.STRAPI_API_TOKEN ||
  undefined;

const hasRole = (user: StrapiAuthResponse["user"] | undefined) =>
  Boolean(user?.role && typeof user.role === "object");

async function fetchUserWithRoleFromServer(userId: string | number) {
  const token = getServerApiToken();
  if (!token) return null;

  const response = await fetch(
    joinCmsApiPath(getCmsApiBaseUrl(), `users/${encodeURIComponent(String(userId))}?populate=role`),
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(STRAPI_ROLE_LOOKUP_TIMEOUT_MS),
    }
  );

  if (!response.ok) return null;
  return response.json() as Promise<StrapiAuthResponse["user"]>;
}

export async function loginWithStrapiCredentials(
  credentials: LoginUserData
): Promise<StrapiAuthResponse> {
  const result = await postCmsAuth<StrapiAuthResponse>("auth/local", credentials);

  if (!result.ok || !result.data?.jwt || !result.data.user) {
    throw new Error(result.error ?? "Login failed");
  }

  const response = result.data;

  if (hasRole(response.user)) {
    return response;
  }

  const serverRoleUser = await fetchUserWithRoleFromServer(response.user.id);
  if (serverRoleUser?.role) {
    return {
      jwt: response.jwt,
      user: {
        ...response.user,
        ...serverRoleUser,
        role: serverRoleUser.role,
      },
    };
  }

  return response;
}

export async function registerWithCms(
  userData: Record<string, unknown>
): Promise<StrapiAuthResponse> {
  const result = await postCmsAuth<StrapiAuthResponse>("access-code/register", userData);

  if (!result.ok || !result.data?.jwt || !result.data.user) {
    throw new Error(result.error ?? "Registration failed");
  }

  return result.data;
}
