type CandidateUser = {
  documentId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  username?: string | null;
} | null | undefined;

type CandidateSessionFields = {
  invitedEmail?: string | null;
  candidateCode?: string | null;
};

export function getLinkedCandidateUser(
  users: CandidateUser | CandidateUser[] | null | undefined
): CandidateUser {
  if (!users) return null;
  if (Array.isArray(users)) return users[0] ?? null;
  return users;
}

/** Prefer full name; never surface access codes as a person's display name. */
export function resolveCandidateDisplayName(
  user: CandidateUser,
  session?: CandidateSessionFields
): string {
  const fullName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fullName) return fullName;
  if (user?.username?.trim()) return user.username.trim();
  const email = user?.email?.trim() || session?.invitedEmail?.trim();
  if (email) return email;
  return "Candidate";
}

export function isCandidateJoined(
  inviteStatus?: "invited" | "registered" | "started" | null
): boolean {
  return inviteStatus === "registered" || inviteStatus === "started";
}

export function formatInviteStatusLabel(
  inviteStatus?: "invited" | "registered" | "started" | null
): string | null {
  if (!inviteStatus) return null;
  if (inviteStatus === "registered") return "Joined";
  if (inviteStatus === "started") return "Started";
  if (inviteStatus === "invited") return "Invited";
  return null;
}
