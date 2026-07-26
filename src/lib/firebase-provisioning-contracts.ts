export type AdministratorBootstrapStatus =
  | "not_staged"
  | "pending"
  | "completed";

export type AdministratorBootstrapStatusResponse = Readonly<{
  status: AdministratorBootstrapStatus;
}>;

export type AdministratorBootstrapRequest = Readonly<{
  displayName: string;
}>;

export type AdministratorBootstrapResponse = Readonly<{
  userId: string;
  alreadyCompleted: boolean;
}>;

export type InvitationAcceptanceRequest = Readonly<{
  token: string;
  displayName: string;
}>;

export type InvitationAcceptanceResponse = Readonly<{
  userId: string;
  membershipId: string;
  organizationId: string;
  alreadyAccepted: boolean;
}>;

export type FirebaseAccountProvisioningRequest = Readonly<{
  token: string;
  email: string;
  password: string;
  displayName: string;
}>;

export type FirebaseAccountProvisioningResponse = Readonly<{
  alreadyProvisioned: boolean;
}>;

export type CandidateInvitationAcceptanceResponse = Readonly<{
  assignmentId: string;
  userId: string;
  alreadyAccepted: boolean;
}>;

export type InvitationLinkType = "organization" | "candidate";

export function parseDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 2 && normalized.length <= 120
    ? normalized
    : null;
}

export function parseInvitationToken(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length >= 32 && normalized.length <= 500
    ? normalized
    : null;
}

export function parseInvitationLinkType(value: unknown): InvitationLinkType | null {
  if (value === null || value === undefined || value === "") {
    return "organization";
  }
  return value === "candidate" || value === "organization" ? value : null;
}

export function parseInvitationEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ? normalized
    : null;
}
