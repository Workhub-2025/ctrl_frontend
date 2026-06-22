type SessionNameFields = {
  name?: string | null;
  campaign?: string | null;
};

/** Human-readable HM assessment session title (not access code or document id). */
export function getHmSessionDisplayName(session: SessionNameFields): string {
  const sessionName = session.name?.trim();
  if (sessionName) return sessionName;
  const campaignName = session.campaign?.trim();
  if (campaignName) return campaignName;
  return "Assessment session";
}
