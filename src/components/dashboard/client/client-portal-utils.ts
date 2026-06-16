export function formatDateTime(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function getAssessmentSettingSummary(settings?: Record<string, unknown> | null) {
  if (!settings || typeof settings !== "object") return [];

  return Object.entries(settings)
    .filter(([key, value]) => key !== "weights" && value && typeof value === "object")
    .map(([key, value]) => {
      const config = value as { version?: unknown; difficulty?: unknown; scoringMode?: unknown };
      const title = key
        .replace(/-/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
      return {
        key,
        label: `${title}: v${String(config.version ?? "1.0.0")}`,
        detail: [
          config.difficulty ? String(config.difficulty) : null,
          config.scoringMode ? `${String(config.scoringMode)} scoring` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    });
}
