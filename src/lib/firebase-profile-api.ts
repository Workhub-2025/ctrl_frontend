import "server-only";

import type { UserProfileResponse, UserProfileUpdatePayload } from "@/services/user-profile.service";
import { createDomainApi } from "@/lib/domain-api";
import { UK_LEGAL } from "@/lib/legal/uk-compliance";

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
  const { equalityMonitoring, ...profileFields } = payload;

  if (equalityMonitoring) {
    const noticeVersion =
      typeof equalityMonitoring.noticeVersion === "string" &&
      equalityMonitoring.noticeVersion.trim()
        ? equalityMonitoring.noticeVersion.trim()
        : UK_LEGAL.equalityMonitoringNoticeVersion;
    await domainApi.request({
      path: "/v1/privacy/me/equality-monitoring",
      method: "PUT",
      firebaseSessionCookie,
      body: { payload: equalityMonitoring, noticeVersion },
    });
  }

  const patchBody = Object.fromEntries(
    Object.entries(profileFields).filter(([, value]) => value !== undefined),
  );
  if (Object.keys(patchBody).length > 0) {
    return domainApi.request<UserProfileResponse>({
      path: "/v1/profile",
      method: "PATCH",
      firebaseSessionCookie,
      body: patchBody,
    });
  }

  return getFirebaseUserProfile(firebaseSessionCookie);
}
