/** Static last-refresh label — not a live clock (see PortalClock in portal chrome). */
export function formatPortalLastRefresh(value: number | null) {
  if (!value) return "Not refreshed yet";
  const formatted = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
  return `Last refreshed ${formatted}`;
}
