import { resolveAppRole } from "@/lib/auth/role-model";

export type ProfileUpdateDecision = Readonly<{
  data: Record<string, unknown>;
  forbiddenEqualityMonitoring: boolean;
}>;

export function canAccessEqualityMonitoring(role: unknown): boolean {
  const appRole = resolveAppRole(role);
  return (
    appRole === "candidate" ||
    appRole === "client" ||
    appRole === "hiring_manager"
  );
}

export function buildAuthorizedProfileUpdate(
  body: Record<string, unknown>,
  role: unknown,
): ProfileUpdateDecision {
  const data: Record<string, unknown> = {};

  for (const key of [
    "firstName",
    "lastName",
    "phone",
    "agreeToMarketing",
    "privacyConsent",
  ] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const forbiddenEqualityMonitoring =
    body.equalityMonitoring !== undefined &&
    !canAccessEqualityMonitoring(role);

  if (
    body.equalityMonitoring !== undefined &&
    !forbiddenEqualityMonitoring
  ) {
    data.equalityMonitoring = body.equalityMonitoring;
  }

  return { data, forbiddenEqualityMonitoring };
}

export function formatMemberSince(
  value: string | Date | null | undefined,
): string {
  if (!value) return "Not available";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function emailVerificationLabel(
  value: boolean | null | undefined,
): "Verified" | "Not verified" | "Not available" {
  if (value === true) return "Verified";
  if (value === false) return "Not verified";
  return "Not available";
}
