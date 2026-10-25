import { cn } from "@/lib/utils";
import { BreakdownSection } from "./breakdown-ui";

/**
 * Six-skill feedback card (call simulation 1.3.0+), from the CTRL Call 2
 * handover pack. Labels are provisional criterion-referenced bands computed by
 * the backend; this component only renders them.
 */

const BANDS = ["Weak", "Below average", "Average", "Above average", "Strong"] as const;

export type SkillFeedbackRow = {
  id: string;
  title: string;
  label: string;
  level: number | null;
  text: string;
};

export function asSkillFeedback(value: unknown): SkillFeedbackRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const row = entry as Partial<SkillFeedbackRow> | null;
    if (!row || typeof row.id !== "string" || typeof row.title !== "string" || typeof row.label !== "string") {
      return [];
    }
    const level = typeof row.level === "number" && row.level >= 0 && row.level <= 4 ? row.level : null;
    return [{ id: row.id, title: row.title, label: row.label, level, text: typeof row.text === "string" ? row.text : "" }];
  });
}

export function CallSimulationSkillCard({
  skills,
  pendingCount,
}: {
  skills: SkillFeedbackRow[];
  pendingCount: number;
}) {
  if (skills.length === 0) return null;
  return (
    <BreakdownSection title="Skill feedback">
      {pendingCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          {pendingCount === 1 ? "One written answer is" : `${pendingCount} written answers are`} awaiting
          review. Affected skills show a label once it is decided; pending answers are not counted as wrong.
        </p>
      ) : null}
      <ul className="divide-y divide-border/60">
        {skills.map((skill) => (
          <li
            key={skill.id}
            className="grid gap-x-4 gap-y-1 py-2.5 sm:grid-cols-[10rem_13rem_minmax(0,1fr)] sm:items-center"
          >
            <p className="text-sm font-semibold text-foreground">{skill.title}</p>
            <div className="flex items-center gap-2">
              <span
                className="flex gap-1"
                role="img"
                aria-label={skill.level === null ? skill.label : `${skill.label}, ${skill.level + 1} of 5`}
              >
                {BANDS.map((band, index) => (
                  <span
                    key={band}
                    className={cn(
                      "h-2 w-4 rounded-sm",
                      skill.level !== null && index <= skill.level ? "bg-primary" : "bg-muted",
                    )}
                  />
                ))}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-xs font-semibold",
                  skill.level === null ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {skill.label}
              </span>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{skill.text}</p>
          </li>
        ))}
      </ul>
      <p className="text-xs leading-5 text-muted-foreground">
        Scale: {BANDS.join(" · ")}. Provisional criterion-based bands of accepted answers; “Average” is a
        mid-band label, not a comparison with other candidates. Skill evidence overlaps. Unmeasured skills
        remain unrated.
      </p>
    </BreakdownSection>
  );
}
