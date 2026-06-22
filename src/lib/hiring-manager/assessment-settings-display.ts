export type AssessmentSettingsSummaryItem = {
  key: string;
  label: string;
  detail: string;
};

/** Summarise per-assessment campaign settings (version, difficulty, scoring mode). */
export function getAssessmentSettingsSummary(
  settings?: Record<string, unknown> | null
): AssessmentSettingsSummaryItem[] {
  if (!settings || typeof settings !== "object") return [];

  return Object.entries(settings)
    .filter(([key, value]) => key !== "weights" && value && typeof value === "object")
    .map(([key, value]) => {
      const config = value as { version?: unknown; difficulty?: unknown; scoringMode?: unknown };
      const title = key
        .replace(/-/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
      const detail = [
        config.difficulty ? String(config.difficulty) : null,
        config.scoringMode ? `${String(config.scoringMode)} scoring` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return {
        key,
        label: `${title} v${String(config.version ?? "1.0.0")}`,
        detail,
      };
    });
}
