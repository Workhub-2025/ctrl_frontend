/**
 * HM-safe Assessment library content previews.
 *
 * Add or edit snippets here — do not pull live rubrics or scoring keys.
 * Samples are illustrative excerpts only (not the full assessed bank).
 *
 * Call-sim audio is a true ~10s clip at
 * `FrontEnd/public/assets/assessment-previews/call-sim-call-1-10s.mp3`
 * (sourced from BackEnd call-simulation Call 1). Snippets here are HM-facing
 * marketing excerpts only — never rubrics, ideal ranks, or scoring keys.
 * Full banks and private rubrics stay on Firebase domain API only.
 */

export type AssessmentLibraryAudioPreview = Readonly<{
  label: string;
  src: string;
  startSeconds: number;
  durationSeconds: number;
}>;

export type AssessmentLibraryPreview = Readonly<{
  /** Short overview used when a release has no version-specific notes. */
  overview: string;
  /** One or more short HM-facing content snippets. */
  samples: readonly string[];
  audioPreview?: AssessmentLibraryAudioPreview | null;
}>;

/**
 * Preferred product-line previews keyed by slug.
 * Optional version overrides go in `ASSESSMENT_LIBRARY_PREVIEW_BY_VERSION`.
 */
export const ASSESSMENT_LIBRARY_PREVIEWS: Readonly<
  Record<string, AssessmentLibraryPreview>
> = {
  "situational-judgement": {
    overview:
      "Candidates choose the most and least effective response to workplace situations under time pressure.",
    samples: [
      "Sample 1 — Emotional overload: You are speaking with someone who is very distressed. They talk quickly, repeat themselves, and jump between points. Select the most and least effective response from four options (acknowledge and structure the call vs interrupt firmly / end quickly).",
      "Sample 2 — Incomplete information: Key details are missing and the caller is becoming frustrated. Select the most and least effective response (ask focused follow-ups vs assume and move on).",
    ],
  },
  prioritisation: {
    overview:
      "Candidates rank competing incidents by urgency, seriousness, vulnerability, immediacy and potential risk.",
    samples: [
      "Sample queue A — six concurrent incidents including: fight with possible head injury; child crying alone at a bus stop; caller locked out of vehicle; lost wallet; parking dispute; theft from shed overnight. Rank 1 (highest priority) to 6.",
      "Sample queue B — risk and vulnerability mix including: elderly resident fallen indoors; historic online fraud; ongoing neighbour dispute; missing person report; noisy party; shop alarm sounding. Rank 1 to 6.",
    ],
  },
  typing: {
    overview:
      "Candidates type operational passages under timed rounds. Speed, accuracy and stability are scored.",
    samples: [
      "Typing excerpt: “A caller reports a disturbance outside a takeaway on Market Street. Two males are arguing near the entrance and one has pushed the other into a metal shutter… No weapon has been seen, but the argument is getting louder.”",
    ],
  },
  "call-simulation": {
    overview:
      "Candidates listen to operational calls and capture caller, system, intelligence and incident information.",
    samples: [
      "Call excerpt (~10s, Call 1 — active car break-in): Caller reports people trying doors on vehicles in a residential street; one male is at a dark-coloured hatchback; the incident is happening now and the caller can still see them from a window.",
    ],
    audioPreview: {
      label: "Call 1 preview — first 10 seconds",
      src: "/assets/assessment-previews/call-sim-call-1-10s.mp3",
      startSeconds: 0,
      durationSeconds: 10,
    },
  },
  "short-term-memory": {
    overview:
      "Candidates study a short operational briefing, withstand interruption, then reconstruct key facts.",
    samples: [
      "Briefing excerpt: Abandoned vehicle on M1 northbound hard shoulder near Junction 23 (S80 3QS). Caller Daniel Reeves. Possible occupant inside; fuel smell reported — approach with caution. Priority grade 2 (Urgent).",
    ],
  },
};

/** Optional per-release overrides (slug@version). */
export const ASSESSMENT_LIBRARY_PREVIEW_BY_VERSION: Readonly<
  Record<string, Partial<AssessmentLibraryPreview>>
> = {
  "call-simulation@1.1.0": {
    overview:
      "Practice call plus two assessed calls. Candidates capture caller, system, intelligence and incident information under timed review.",
  },
  "call-simulation@1.0.1": {
    overview:
      "Historical single-call product line. Prefer 1.1.0 for new campaigns.",
  },
};

export function getAssessmentLibraryPreview(
  slug: string,
  version?: string | null,
): AssessmentLibraryPreview | null {
  const base = ASSESSMENT_LIBRARY_PREVIEWS[slug];
  if (!base) return null;
  if (!version) return base;
  const override = ASSESSMENT_LIBRARY_PREVIEW_BY_VERSION[`${slug}@${version}`];
  if (!override) return base;
  return {
    overview: override.overview ?? base.overview,
    samples: override.samples ?? base.samples,
    audioPreview:
      override.audioPreview !== undefined
        ? override.audioPreview
        : base.audioPreview,
  };
}
