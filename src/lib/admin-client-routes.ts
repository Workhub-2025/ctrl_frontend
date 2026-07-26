import { getCmsApiBaseUrl, joinCmsApiPath, stripLeadingSlashes } from "@/legacy-cms/server-url";

export function getAdminClientStrapiPath(clientId: string, suffix: string) {
  return `/admin/clients/${encodeURIComponent(clientId)}/${stripLeadingSlashes(suffix)}`;
}

export function getAdminClientStrapiUrl(clientId: string, suffix: string) {
  return joinCmsApiPath(getCmsApiBaseUrl(), getAdminClientStrapiPath(clientId, suffix));
}
