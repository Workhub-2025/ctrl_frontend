import "server-only";

import type { UserProfileResponse, UserProfileUpdatePayload } from "@/services/user-profile.service";
import { createDomainApi } from "@/lib/domain-api";

export async function getFirebaseUserProfile(
  firebaseSessionCookie: string,
): Promise<UserProfileResponse> {
  const domainApi = createDomainApi();
  return domainApi.request<UserProfileResponse>({
    path: "/v1/profile",
    firebaseSessionCookie,
  });
}

export async function updateFirebaseUserProfile(
  firebaseSessionCookie: string,
  payload: UserProfileUpdatePayload,
): Promise<UserProfileResponse> {
  const domainApi = createDomainApi();
  return domainApi.request<UserProfileResponse>({
    path: "/v1/profile",
    method: "PATCH",
    firebaseSessionCookie,
    body: payload,
  });
}
