import type {
  CandidatePortalApplication,
  CandidatePortalAssessment,
} from "@/services/candidate-session.service";

/**
 * Shared model + helpers for the Candidate portal surfaces (overview,
 * my-assessments, help). Keeps status mapping, tones and formatting in one
 * place so every candidate page reads identically.
 */

export type CandidateApplicationStatus =
  | "Awaiting Assessment"
  | "In Progress"
  | "Completed"
  | "Progressed"
  | "Unsuccessful"
  | "Soft Locked";

/** Normalised, display-ready view of a candidate session. */
export type CandidateApplicationView = {
  key: string;
  code: string;
  campaign: string;
  role: string;
  status: CandidateApplicationStatus;
  /** Raw backend mode value, e.g. "remote" | "in_person". */
  mode: string;
  /** Human-readable mode, e.g. "Remote". */
  modeLabel: string;
  location: string;
  completedCount: number;
  totalCount: number;
  completionPercent: number;
  date: string;
  dueAt?: string | null;
  linkedAt?: string | null;
  sessionStartsAt?: string | null;
  expiresAt?: string | null;
  completedAt?: string | null;
  assessmentSessionName?: string | null;
  assessments: CandidatePortalAssessment[];
  /** Escape hatch to the full backend payload. */
  raw: CandidatePortalApplication;
};

export function mapPortalStatus(
  application: CandidatePortalApplication
): CandidateApplicationStatus {
  switch (application.portalStatus ?? application.sessionStatus) {
    case "in_progress":
    case "active":
      return "In Progress";
    case "completed":
      return "Completed";
    case "progressed":
      return "Progressed";
    case "unsuccessful":
      return "Unsuccessful";
    case "soft_locked":
    case "locked":
      return "Soft Locked";
    case "awaiting_assessment":
    case "pending":
    default:
      return "Awaiting Assessment";
  }
}

export function formatMode(value?: string | null) {
  switch (value) {
    case "remote":
      return "Remote";
    case "hybrid":
      return "Hybrid";
    case "in_person":
      return "In-person";
    default:
      return "Mode to be confirmed";
  }
}

export function formatDate(value?: string | null) {
  if (!value) return "Date to be confirmed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date to be confirmed";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getApplicationKey(application: CandidatePortalApplication) {
  return application.documentId ?? application.candidateCode ?? "";
}

export function mapApplication(
  application: CandidatePortalApplication,
  index = 0
): CandidateApplicationView {
  const completed = application.completion?.completed ?? 0;
  const total =
    application.completion?.total ?? application.assessments?.length ?? 0;
  const completionPercent =
    total > 0 ? Math.round((completed / total) * 100) : 0;
  const dueAt =
    application.sessionStartsAt ??
    application.campaign?.endDate ??
    application.expiresAt ??
    null;

  return {
    key:
      application.documentId ??
      application.candidateCode ??
      `application-${index}`,
    code:
      application.candidateCode ??
      application.documentId ??
      "Access Code linked",
    campaign: application.campaign?.name ?? "Assessment",
    role: application.campaign?.jobRole ?? "Candidate assessment",
    status: mapPortalStatus(application),
    mode: application.mode ?? "",
    modeLabel: formatMode(application.mode),
    location:
      application.campaign?.location ??
      application.mode ??
      "Location to be confirmed",
    completedCount: completed,
    totalCount: total,
    completionPercent,
    date: formatDate(dueAt),
    dueAt,
    linkedAt: application.usedAt ?? null,
    sessionStartsAt:
      application.sessionStartsAt ??
      application.assessmentSession?.startsAt ??
      null,
    expiresAt: application.expiresAt ?? null,
    completedAt: application.completedAt ?? null,
    assessmentSessionName: application.assessmentSession?.name ?? null,
    assessments: application.assessments ?? [],
    raw: application,
  };
}

/** Statuses that still require candidate action / are in flight. */
export function isActiveStatus(status: CandidateApplicationStatus) {
  return (
    status === "Awaiting Assessment" ||
    status === "In Progress" ||
    status === "Soft Locked"
  );
}

/**
 * Semantic status tones aligned with the Hiring Manager tonal system:
 * emerald = done/positive, blue = active, amber = needs attention,
 * slate = idle/locked, rose = negative outcome. Light + dark variants are
 * provided so the accessibility themes remap cleanly.
 */
const statusToneClassNames: Record<CandidateApplicationStatus, string> = {
  "Awaiting Assessment":
    "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  "In Progress":
    "border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-300",
  Completed:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  Progressed:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  Unsuccessful:
    "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  "Soft Locked":
    "border-slate-500/25 bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

export function statusBadgeClassName(status: CandidateApplicationStatus) {
  return `inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${statusToneClassNames[status]}`;
}

const statusDotClassNames: Record<CandidateApplicationStatus, string> = {
  "Awaiting Assessment": "bg-amber-500",
  "In Progress": "bg-blue-500",
  Completed: "bg-emerald-500",
  Progressed: "bg-emerald-500",
  Unsuccessful: "bg-rose-500",
  "Soft Locked": "bg-slate-400",
};

export function statusDotClassName(status: CandidateApplicationStatus) {
  return statusDotClassNames[status];
}

const statusAccent: Record<
  CandidateApplicationStatus,
  "primary" | "success" | "warning" | "muted"
> = {
  "Awaiting Assessment": "warning",
  "In Progress": "primary",
  Completed: "success",
  Progressed: "success",
  Unsuccessful: "muted",
  "Soft Locked": "muted",
};

export function statusCardAccent(status: CandidateApplicationStatus) {
  return statusAccent[status];
}

/* --------------------------------- sorting -------------------------------- */

export type AssessmentSortOption =
  | "attention"
  | "due_closest"
  | "newest"
  | "name_az";

const statusSortRank: Record<CandidateApplicationStatus, number> = {
  "In Progress": 0,
  "Awaiting Assessment": 1,
  "Soft Locked": 2,
  Completed: 3,
  Progressed: 4,
  Unsuccessful: 5,
};

export function getAttentionRank(application: CandidateApplicationView) {
  const hasAvailableAssessment = application.assessments.some(
    (assessment) =>
      assessment.status !== "completed" &&
      assessment.status !== "not_open" &&
      assessment.status !== "locked" &&
      assessment.isAvailable !== false
  );

  if (hasAvailableAssessment) return 0;
  if (application.status === "In Progress") return 1;
  if (application.assessments.some((a) => a.status === "not_open")) return 2;
  if (
    application.status === "Soft Locked" ||
    application.assessments.some((a) => a.status === "locked")
  )
    return 3;
  if (application.status === "Completed") return 4;

  return statusSortRank[application.status];
}

export function compareDates(
  a?: string | null,
  b?: string | null,
  ascending = true
) {
  if (!a && !b) return 0;
  if (!a) return ascending ? 1 : -1;
  if (!b) return ascending ? -1 : 1;
  const timeA = new Date(a).getTime();
  const timeB = new Date(b).getTime();
  const validA = !Number.isNaN(timeA);
  const validB = !Number.isNaN(timeB);
  if (!validA && !validB) return 0;
  if (!validA) return ascending ? 1 : -1;
  if (!validB) return ascending ? -1 : 1;
  return ascending ? timeA - timeB : timeB - timeA;
}

export function compareText(left: string, right: string) {
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

/** Session has at least one assessment the candidate can start now. */
export function hasAvailableAssessment(application: CandidateApplicationView) {
  return application.assessments.some(
    (assessment) =>
      assessment.status !== "completed" &&
      assessment.status !== "not_open" &&
      assessment.status !== "locked" &&
      assessment.isAvailable !== false
  );
}

/** Plain-language guidance for terminal / waiting outcomes. */
export function getOutcomeGuidance(status: CandidateApplicationStatus): {
  title: string;
  body: string;
} {
  switch (status) {
    case "Progressed":
      return {
        title: "You’ve progressed",
        body: "Your hiring team has reviewed your submission and moved you forward in the process. They’ll contact you directly about next steps.",
      };
    case "Unsuccessful":
      return {
        title: "Process complete",
        body: "Your submission has been reviewed. The hiring team will reach out if there are any updates regarding your application.",
      };
    case "Completed":
      return {
        title: "All assessments submitted",
        body: "Your responses are with the hiring team for review. You don’t need to take further action unless they contact you.",
      };
    case "Soft Locked":
      return {
        title: "Waiting for assessor unlock",
        body: "This session is locked until your assessor releases it. If you’re in the room, let them know — they can unlock it instantly.",
      };
    case "In Progress":
      return {
        title: "In progress",
        body: "You have assessments to complete. Work through each task below and submit when ready.",
      };
    default:
      return {
        title: "Ready when you are",
        body: "Your assigned assessments are listed below. Start the first available task when you’re ready.",
      };
  }
}

/** Highest-priority session for default selection / “next up”. */
export function pickPrioritySession(applications: CandidateApplicationView[]) {
  if (!applications.length) return null;
  return sortApplications(applications, "attention")[0] ?? null;
}

export function sortApplications(
  applications: CandidateApplicationView[],
  sortBy: AssessmentSortOption
) {
  const sorted = [...applications];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "due_closest":
        return (
          compareDates(a.dueAt, b.dueAt, true) ||
          compareText(a.campaign, b.campaign)
        );
      case "newest":
        return (
          compareDates(a.linkedAt, b.linkedAt, false) ||
          compareText(a.campaign, b.campaign)
        );
      case "name_az":
        return compareText(a.campaign, b.campaign);
      case "attention":
      default:
        return (
          getAttentionRank(a) - getAttentionRank(b) ||
          compareDates(a.dueAt, b.dueAt, true) ||
          compareText(a.campaign, b.campaign)
        );
    }
  });
  return sorted;
}
