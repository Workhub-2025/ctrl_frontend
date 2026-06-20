import { getStrapiApiBaseUrl, joinStrapiApiPath, stripLeadingSlashes } from "@/lib/strapi-server";

export function getAdminClientStrapiPath(clientId: string, suffix: string) {
  return `/admin/clients/${encodeURIComponent(clientId)}/${stripLeadingSlashes(suffix)}`;
}

export function getAdminClientStrapiUrl(clientId: string, suffix: string) {
  return joinStrapiApiPath(getStrapiApiBaseUrl(), getAdminClientStrapiPath(clientId, suffix));
}
