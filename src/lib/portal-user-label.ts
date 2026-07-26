/**
 * Portal chrome label: first name + last initial with a period (e.g. "Mihir P.").
 * Falls back through displayName / session name / email local-part.
 */
export function formatPortalUserLabel(user: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  displayName?: string | null;
  email?: string | null;
} | null | undefined): string {
  const first = user?.firstName?.trim() ?? "";
  const last = user?.lastName?.trim() ?? "";
  if (first && last) {
    return `${first} ${last.charAt(0).toUpperCase()}.`;
  }
  if (first) return first;

  const combined =
    user?.displayName?.trim() ||
    user?.name?.trim() ||
    "";
  if (combined) {
    const parts = combined.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1]!;
      return `${parts[0]} ${lastPart.charAt(0).toUpperCase()}.`;
    }
    return parts[0] ?? "User";
  }

  const emailLocal = user?.email?.split("@")[0]?.trim();
  if (emailLocal) return emailLocal;
  return "User";
}

export function splitDisplayName(displayName: string | null | undefined): {
  firstName?: string;
  lastName?: string;
} {
  const trimmed = displayName?.trim() ?? "";
  if (!trimmed) return {};
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0] };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}
