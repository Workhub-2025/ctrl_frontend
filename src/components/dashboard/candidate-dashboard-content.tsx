"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowUpDown,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Globe,
  Loader2,
  Lock,
  Mail,
  MapPin,
  PlayCircle,
  RefreshCw,
  Target,
} from "lucide-react";
import { SecurePreflightModal } from "@/components/assessment";
import { candidateAssessmentItems } from "@/components/dashboard/candidate-dashboard-data";
import { ContactFormDialog } from "@/components/dashboard/contact-form-dialog";
import { LocationMapDialog } from "@/components/dashboard/location-map-dialog";
import {
  CandidateSessionService,
  type CandidatePortalApplication,
  type CandidatePortalAssessment,
} from "@/services/candidate-session.service";
import { listenForAssessmentCompletion } from "@/lib/assessment-completion";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";

type CandidateApplicationStatus =
  | "Awaiting Assessment"
  | "In Progress"
  | "Completed"
  | "Progressed"
  | "Unsuccessful"
  | "Soft Locked";

type CandidateApplication = {
  key: string;
  code: string;
  campaign: string;
  role: string;
  date: string;
  dueAt?: string | null;
  linkedAt?: string | null;
  status: CandidateApplicationStatus;
  location: string;
  mode: string;
  completion: string;
  completedCount: number;
  totalCount: number;
  completionPercent: number;
  sessionStartsAt?: string | null;
  assessments: CandidatePortalAssessment[];
};

type AssessmentSortOption =
  | "attention"
  | "due_closest"
  | "newest"
  | "name_az";

const statusClassNames: Record<CandidateApplicationStatus, string> = {
  "Awaiting Assessment":
    "bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 font-semibold rounded-lg",
  "In Progress":
    "bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 font-semibold rounded-lg",
  Completed:
    "bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 font-semibold rounded-lg",
  Progressed:
    "bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-0.5 font-semibold rounded-lg",
  Unsuccessful:
    "bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 font-semibold rounded-lg",
  "Soft Locked":
    "bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2.5 py-0.5 font-semibold rounded-lg",
};

const statusSortRank: Record<CandidateApplicationStatus, number> = {
  "In Progress": 0,
  "Awaiting Assessment": 1,
  "Soft Locked": 2,
  Completed: 3,
  Progressed: 4,
  Unsuccessful: 5,
};

function getAttentionRank(application: CandidateApplication) {
  const hasAvailableAssessment = application.assessments.some(
    (assessment) =>
      assessment.status !== "completed" &&
      assessment.status !== "not_open" &&
      assessment.status !== "locked" &&
      assessment.isAvailable !== false
  );

  if (hasAvailableAssessment) return 0;
  if (application.status === "In Progress") return 1;
  if (application.assessments.some((assessment) => assessment.status === "not_open")) return 2;
  if (application.status === "Soft Locked" || application.assessments.some((assessment) => assessment.status === "locked")) return 3;
  if (application.status === "Completed") return 4;

  return statusSortRank[application.status];
}

function compareDates(a?: string | null, b?: string | null, ascending = true) {
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

function compareText(left: string, right: string) {
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function formatDate(value?: string | null) {
  if (!value) return "Date to be confirmed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date to be confirmed";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | null) {
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

function formatRefreshTime(value: number | null) {
  if (!value) return "Not refreshed yet";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function mapPortalStatus(
  application: CandidatePortalApplication
): CandidateApplicationStatus {
  switch (application.portalStatus ?? application.sessionStatus) {
    case "in_progress":
    case "active": return "In Progress";
    case "completed": return "Completed";
    case "progressed": return "Progressed";
    case "unsuccessful": return "Unsuccessful";
    case "soft_locked":
    case "locked": return "Soft Locked";
    case "awaiting_assessment":
    case "pending":
    default: return "Awaiting Assessment";
  }
}

function mapApplication(
  application: CandidatePortalApplication
): CandidateApplication {
  const completed = application.completion?.completed ?? 0;
  const total = application.completion?.total ?? application.assessments?.length ?? 0;
  const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const dueAt = application.sessionStartsAt ?? application.campaign?.endDate ?? application.expiresAt ?? null;

  return {
    key: application.documentId ?? application.candidateCode ?? crypto.randomUUID(),
    code: application.candidateCode ?? application.documentId ?? "Access Code linked",
    campaign: application.campaign?.name ?? "Assessment",
    role: application.campaign?.jobRole ?? "Candidate assessment",
    date: formatDate(dueAt),
    dueAt,
    linkedAt: application.usedAt ?? null,
    status: mapPortalStatus(application),
    location: application.campaign?.location ?? application.mode ?? "Location to be confirmed",
    mode: formatMode(application.mode),
    completion: total > 0 ? `${completed} of ${total} assessments submitted` : "No assessments assigned yet",
    completedCount: completed,
    totalCount: total,
    completionPercent,
    sessionStartsAt: application.sessionStartsAt ?? application.assessmentSession?.startsAt ?? null,
    assessments: application.assessments ?? [],
  };
}

function formatMode(value?: string | null) {
  switch (value) {
    case "remote": return "Remote";
    case "hybrid": return "Hybrid";
    case "in_person": return "In-person";
    default: return "Mode to be confirmed";
  }
}

function normaliseSlug(value?: string) {
  return (value ?? "").toLowerCase().replace(/_/g, "-").replace("prioritization", "prioritisation");
}

function getCandidateAssessmentSlug(item: (typeof candidateAssessmentItems)[number]) {
  return normaliseSlug(item.href.split("/").pop());
}

function getAssessmentItemsForApplication(application: CandidateApplication) {
  if (!application.assessments.length) return [];

  return application.assessments.map((assessment) => {
    const slug = normaliseSlug(assessment.slug);
    const matchedItem = candidateAssessmentItems.find(
      (item) =>
        getCandidateAssessmentSlug(item) === slug ||
        normaliseSlug(item.title) === slug ||
        normaliseSlug(item.title) === normaliseSlug(assessment.name)
    );

    const isLocked = assessment.status === "locked";

    return {
      icon: matchedItem?.icon ?? ClipboardCheck,
      title: assessment.name ?? matchedItem?.title ?? "Assessment",
      description:
        isLocked
          ? "Waiting for assessor to unlock your session."
          : assessment.status === "not_open"
            ? `Opens ${formatDateTime(assessment.availableFrom) ? ` at ${formatDateTime(assessment.availableFrom)}` : ""}.`
            : matchedItem?.description ?? "Complete this assigned assessment.",
      href: `${matchedItem?.href ?? `/assessment/${slug}`}?candidateSessionDocumentId=${encodeURIComponent(application.key)}`,
      isCompleted: assessment.status === "completed",
      isAvailable: assessment.isAvailable !== false && assessment.status !== "not_open" && !isLocked,
      isLocked,
      availableFromLabel: formatDateTime(assessment.availableFrom),
    };
  });
}

// Interactive countdown timer helper for soft-locked, in-person sessions
function SoftLockTimer({ sessionStartsAt }: { sessionStartsAt?: string | null }) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!sessionStartsAt) return;
    const target = new Date(sessionStartsAt).getTime();
    if (Number.isNaN(target)) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft("past");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setTimeLeft(parts.join(" "));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [sessionStartsAt]);

  if (!sessionStartsAt) {
    return (
      <>
        This session requires your assessor to unlock it. Please wait for the hiring manager to unlock your session.
      </>
    );
  }

  if (timeLeft === "past" || new Date(sessionStartsAt).getTime() <= Date.now()) {
    return (
      <>
        Assessor unlock required (scheduled start was <span className="font-semibold text-amber-400">{formatDateTime(sessionStartsAt)}</span> - waiting for hiring manager).
      </>
    );
  }

  return (
    <>
      Session is scheduled to start at <span className="font-semibold text-primary">{formatDateTime(sessionStartsAt)}</span>.<br />
      Unlocks in <span className="font-bold text-amber-400">{timeLeft || "calculating..."}</span>. Please wait for the scheduled session time.
    </>
  );
}

// Redesigned Gamified Journey Map Node List Item
function AssessmentListItem({ item, step, totalSteps }: { item: any; step: number; totalSteps: number }) {
  const [showPreflight, setShowPreflight] = useState(false);

  const isCompleted = item.isCompleted;
  const isLocked = item.isLocked;
  const isAvailable = item.isAvailable;
  const isActive = !isCompleted && isAvailable;

  // Determine if the assessment has a future startsAt and should be disabled
  const hasFutureStart = (() => {
    if (!item.startsAt) return false;
    const startTime = new Date(item.startsAt).getTime();
    return !Number.isNaN(startTime) && startTime > Date.now();
  })();

  return (
    <>
      <div className="relative flex gap-6 group">
        {/* Timeline Connecting Line Segment */}
        {step < totalSteps && (
          <div
            className={`absolute left-6 top-12 bottom-0 w-[2px] -ml-[1px] z-0 hidden sm:block ${
              isCompleted
                ? "bg-gradient-to-b from-emerald-500 to-primary/40"
                : isActive
                ? "bg-gradient-to-b from-primary/40 to-border/40 border-dashed border-l"
                : "bg-border dark:bg-white/10"
            }`}
          />
        )}

        {/* Node Circle Badge */}
        <div className="relative z-10 shrink-0 hidden sm:block">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-all duration-300 ${
              isCompleted
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                : isActive
                ? "bg-primary/10 text-primary border-primary/40 shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-2 ring-primary/10"
                : "bg-muted/40 text-slate-500 border-border dark:bg-[#0b1329]/10 dark:border-white/5 opacity-60"
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            ) : isLocked ? (
              <Lock className="h-5 w-5" aria-hidden="true" />
            ) : (
              <item.icon className="h-6 w-6" aria-hidden="true" />
            )}
          </div>
        </div>

        {/* Card Component Panel */}
        <div
          className={`flex-1 min-w-0 p-5 rounded-2xl border transition-all duration-300 ${
            isCompleted
              ? "bg-muted/15 border-border/60 dark:bg-[#0b1329]/15 dark:border-white/5 opacity-80"
              : isActive
              ? "bg-card border-primary/50 shadow-[0_0_25px_rgba(59,130,246,0.08)] hover:shadow-[0_0_30px_rgba(59,130,246,0.12)] dark:bg-[#0b1329]/50 dark:border-primary/40 ring-1 ring-primary/10"
              : "bg-muted/5 border-border dark:bg-[#0b1329]/5 dark:border-white/5 opacity-65 grayscale-[20%]"
          }`}
        >
          <div className="flex flex-wrap gap-2 items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <h4 className="font-bold text-foreground text-lg tracking-tight truncate">
                {item.title}
              </h4>
              {isActive && (
                <span className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Active Now
                </span>
              )}
            </div>
            <Badge
              variant="outline"
              className={`text-xs uppercase tracking-wider font-semibold rounded-md border px-2 py-0.5 pointer-events-none ${
                isCompleted
                  ? "border-emerald-500/10 bg-emerald-500/5 text-emerald-400"
                  : isActive
                  ? "border-primary/15 bg-primary/5 text-primary"
                  : "border-white/5 bg-white/[0.04] text-slate-400"
              }`}
            >
              Step {step}
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mb-4 line-clamp-2 leading-relaxed">
            {item.description}
          </p>

          {/* Action Button */}
          <div className="flex flex-wrap items-center gap-3">
            {isCompleted ? (
              <Button
                variant="outline"
                className="h-9 text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 pointer-events-none font-semibold rounded-lg"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" /> Submitted
              </Button>
            ) : isLocked ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-500/5 border border-slate-500/10 px-3 py-2 rounded-lg">
                <Lock className="h-3.5 w-3.5" />
                <span>
                  {item.isLocked
                    ? "Assessor Unlock Required"
                    : item.availableFromLabel
                    ? `Opens ${item.availableFromLabel}`
                    : "Locked"}
                </span>
              </div>
            ) : hasFutureStart ? (
              <div className="space-y-2">
                <Button
                  disabled
                  className="h-9 gap-2 font-semibold rounded-lg opacity-60 cursor-not-allowed"
                >
                  <PlayCircle className="h-4 w-4" aria-hidden="true" /> Start Assessment
                </Button>
                <p className="text-xs text-slate-400">
                  <SoftLockTimer sessionStartsAt={item.startsAt} />
                </p>
              </div>
            ) : (
              <Button
                onClick={() => setShowPreflight(true)}
                className="h-9 gap-2 shadow-md transition-transform hover:scale-[1.02] font-semibold rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <PlayCircle className="h-4 w-4" aria-hidden="true" /> Start Assessment
              </Button>
            )}
          </div>
        </div>
      </div>
      <SecurePreflightModal
        isOpen={showPreflight}
        onClose={() => setShowPreflight(false)}
        assessmentName={item.title}
        href={item.href}
      />
    </>
  );
}

// Mode-based subtitle for the detail header
function DetailSubtitle({ application }: { application: CandidateApplication }) {
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);

  const isRemote =
    application.mode === "Remote" ||
    application.mode === "remote";

  const isInPerson =
    application.mode === "In-person" ||
    application.mode === "in_person";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-slate-400 text-sm mt-1">
      <span className="font-semibold text-slate-300">{application.role}</span>
      <span className="h-1 w-1 rounded-full bg-slate-700 hidden sm:inline-block" />

      {isRemote ? (
        <div className="flex items-center gap-1 text-slate-400 bg-slate-500/5 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 px-2.5 py-0.5 rounded-lg">
          <Globe className="h-3.5 w-3.5 text-primary/80 shrink-0" aria-hidden="true" />
          <span>Remote Session</span>
        </div>
      ) : isInPerson ? (
        <>
          <button
            type="button"
            onClick={() => setLocationDialogOpen(true)}
            className="flex items-center gap-1 text-slate-400 bg-slate-500/5 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 px-2.5 py-0.5 rounded-lg hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
          >
            <MapPin className="h-3.5 w-3.5 text-primary/80 shrink-0" aria-hidden="true" />
            <span>{application.location || "View Location"}</span>
          </button>
          <LocationMapDialog
            address={application.location === "Location to be confirmed" ? "" : application.location}
            open={locationDialogOpen}
            onOpenChange={setLocationDialogOpen}
          />
        </>
      ) : (
        <>
          <div className="flex items-center gap-1 text-slate-400 bg-slate-500/5 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 px-2.5 py-0.5 rounded-lg">
            <MapPin className="h-3.5 w-3.5 text-primary/80 shrink-0" aria-hidden="true" />
            <span>{application.location}</span>
          </div>
          <span className="h-1 w-1 rounded-full bg-slate-700 hidden sm:inline-block" />
          <div className="flex items-center gap-1 text-slate-400 bg-slate-500/5 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 px-2.5 py-0.5 rounded-lg">
            <Target className="h-3.5 w-3.5 text-primary/80 shrink-0" aria-hidden="true" />
            <span>{application.mode}</span>
          </div>
        </>
      )}
    </div>
  );
}

export function CandidateDashboardContent() {
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get("session");
  const [selectedApplicationKey, setSelectedApplicationKey] = useState<string | null>(sessionParam);
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [sortBy, setSortBy] = useState<AssessmentSortOption>("attention");
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(
    CandidateSessionService.getMyApplicationsLastRefresh()
  );

  useEffect(() => {
    setSelectedApplicationKey(sessionParam);
  }, [sessionParam]);

  const loadApplications = useCallback(async (options?: { force?: boolean; preserveOnError?: boolean }) => {
    const isManualRefresh = !!options?.force;
    const startTime = Date.now();
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setLoadError("");

    try {
      const portalApplications = await CandidateSessionService.getMyApplications({ force: options?.force });
      const mappedApplications = portalApplications.map(mapApplication);

      setApplications(mappedApplications);
      setLastRefreshAt(CandidateSessionService.getMyApplicationsLastRefresh());

      // Keep an explicit selection if it still exists. Without a session query,
      // land on the campaign list instead of silently opening the first item.
      setSelectedApplicationKey((currentKey) => {
        if (currentKey && mappedApplications.some((app) => app.key === currentKey)) return currentKey;
        return null;
      });
    } catch (applicationError) {
      console.error("[CandidateDashboard] Failed to load applications:", applicationError);
      if (!options?.preserveOnError) {
        setLoadError("We could not load your assessments. Please refresh or try again shortly.");
      }
    } finally {
      if (isManualRefresh) {
        const elapsedTime = Date.now() - startTime;
        const minSpin = 800; // ms to ensure smooth complete spin
        if (elapsedTime < minSpin) {
          await new Promise((resolve) => setTimeout(resolve, minSpin - elapsedTime));
        }
      }
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    return listenForAssessmentCompletion(() => {
      void loadApplications({ force: true, preserveOnError: true });
    });
  }, [loadApplications]);

  const currentApplication = applications.find((app) => app.key === selectedApplicationKey);
  const currentAssessmentItems = currentApplication ? getAssessmentItemsForApplication(currentApplication) : [];
  const sortedApplications = useMemo(() => {
    const sorted = [...applications];

    sorted.sort((a, b) => {
      switch (sortBy) {
        case "due_closest":
          return compareDates(a.dueAt, b.dueAt, true) || compareText(a.campaign, b.campaign);
        case "newest":
          return compareDates(a.linkedAt, b.linkedAt, false) || compareText(a.campaign, b.campaign);
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
  }, [applications, sortBy]);

  if (loadError) {
    return (
      <div className="p-6">
        <Alert className="border-red-500/30 bg-red-500/10 text-red-400 rounded-2xl">
          <AlertTitle className="font-bold">Assessments unavailable</AlertTitle>
          <AlertDescription className="text-sm leading-relaxed">{loadError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading && applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 motion-safe:animate-pulse">
        <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" aria-hidden="true" />
        <p>Loading your assessments…</p>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="p-6">
        <Card className="overflow-hidden border-border bg-card shadow-2xl dark:border-white/10 dark:bg-[#0b1329]/40 dark:backdrop-blur-md rounded-[2rem]">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 shadow-inner border border-primary/20">
              <Briefcase className="h-8 w-8" aria-hidden="true" />
            </div>
            <CardTitle className="text-2xl mb-2 text-foreground font-bold">No assessments linked yet</CardTitle>
            <CardDescription className="max-w-md text-slate-400 text-base leading-relaxed">
              You haven’t linked any assessments yet. Return to the Dashboard to enter an Access Code provided by your Hiring Manager.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mobile visibility states
  const showListOnMobile = !selectedApplicationKey;
  const showDetailOnMobile = !!selectedApplicationKey;

  return (
    <div className="max-w-7xl space-y-6">
      <div className={selectedApplicationKey ? "hidden lg:block" : "block"}>
        <HiringManagerPageHeader
          eyebrow="My Assessments"
          title="My Assessments"
          description="View and manage your active assessment sessions and progress."
          icon={Briefcase}
        />
      </div>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-6rem)] w-full gap-0 lg:gap-6 animate-in fade-in duration-500">
        {/* LEFT PANE: ASSESSMENT LIST (Master) */}
        <div
          className={`w-full lg:w-[400px] xl:w-[460px] 2xl:w-[520px] shrink-0 flex flex-col gap-4 lg:sticky lg:top-[5.5rem] lg:self-start lg:max-h-[calc(100vh-8rem)] ${
            showListOnMobile ? "block" : "hidden lg:flex"
          }`}
        >
          <div className="flex items-center justify-between px-2 lg:px-0 h-10">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Linked Assessments ({applications.length})
            </span>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as AssessmentSortOption)}>
              <SelectTrigger aria-label="Sort assessments" className="h-9 w-[190px] rounded-xl bg-background dark:bg-[#0b1329]/40 dark:border-white/10 shadow-sm focus:ring-2 focus:ring-primary focus:outline-none">
                <ArrowUpDown className="mr-2 h-4 w-4 text-slate-400" aria-hidden="true" />
                <SelectValue aria-label="Sort assessments" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="attention">Action required</SelectItem>
                <SelectItem value="due_closest">Due date</SelectItem>
                <SelectItem value="newest">Recently added</SelectItem>
                <SelectItem value="name_az">Alphabetical (A-Z)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void loadApplications({ force: true })}
              disabled={isRefreshing}
              className="h-8 w-8 rounded-full hover:!bg-white/10 hover:!text-white text-slate-400 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              title="Refresh"
              aria-label="Refresh assessments"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-8 space-y-3 custom-scrollbar">
          {sortedApplications.map((app) => {
            const isActive = app.status === "Awaiting Assessment" || app.status === "In Progress";
            const isSelected = app.key === selectedApplicationKey;

            return (
              <button
                key={app.key}
                type="button"
                onClick={() => setSelectedApplicationKey(app.key)}
                className={`w-full text-left group rounded-2xl p-5 border transition-[border-color,background-color,box-shadow] duration-300 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-lg dark:bg-primary/15 dark:border-primary ring-1 ring-primary/25"
                    : "border-border bg-card hover:border-slate-400 hover:shadow-md dark:border-white/5 dark:bg-[#0b1329]/30 hover:dark:border-white/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {app.campaign}
                  </h3>
                  {/* Status Indicator Dot */}
                  <div className="flex items-center gap-1.5 shrink-0 mt-1">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        isActive ? "bg-primary motion-safe:animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-muted-foreground"
                      }`}
                    />
                  </div>
                </div>
                <p className="text-sm text-slate-400 line-clamp-1 mb-4">{app.role}</p>

                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-400 flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> {app.date}
                  </span>
                  <Badge
                    variant="secondary"
                    className={`bg-transparent border-none p-0 font-bold ${
                      isActive ? "text-primary" : "text-slate-400"
                    }`}
                  >
                    {app.completionPercent}%
                  </Badge>
                </div>
                <Progress value={app.completionPercent} className={`h-1.5 mt-2.5 ${isSelected ? "bg-primary/20" : ""}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANE: ASSESSMENT DETAILS (Detail) */}
      <div className={`flex-1 flex flex-col min-w-0 ${showDetailOnMobile ? "block" : "hidden lg:flex"}`}>
        {currentApplication ? (
          <div className="flex-1 bg-card border border-border dark:border-white/10 dark:bg-[#0b1329]/40 dark:backdrop-blur-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col motion-safe:animate-in motion-safe:slide-in-from-right-4 lg:motion-safe:slide-in-from-bottom-4 duration-300">

            {/* Detail Header */}
            <div className="relative p-6 sm:p-8 border-b border-border dark:border-white/10 dark:bg-[#0b1220]/20 bg-white/[0.02]">
              {/* Mobile Back Button */}
              <Button
                variant="ghost"
                className="lg:hidden mb-4 -ml-2 text-slate-400 hover:!text-white hover:!bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                onClick={() => setSelectedApplicationKey(null)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" /> Back to list
              </Button>

              <div className="flex flex-col gap-3.5 relative z-10">
                <div>
                  {currentApplication.status !== "In Progress" && currentApplication.status !== "Awaiting Assessment" && (
                    <Badge variant="outline" className={`${statusClassNames[currentApplication.status]} pointer-events-none`}>
                      {currentApplication.status}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2 min-w-0">
                  <h2 className="text-3xl font-extrabold text-foreground tracking-tight line-clamp-2">
                    {currentApplication.campaign}
                  </h2>
                  <DetailSubtitle application={currentApplication} />
                </div>
              </div>
            </div>

            {/* Detail Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar relative z-10">
              {/* Status Banner */}
              {(currentApplication.status === "Awaiting Assessment" || currentApplication.status === "In Progress") && (
                <Alert className="border-primary/20 bg-primary/5 text-primary rounded-2xl p-5 shadow-inner">
                  <Target className="h-5 w-5 text-primary" aria-hidden="true" />
                  <AlertTitle className="text-lg font-bold tracking-tight">Your Tasks</AlertTitle>
                  <AlertDescription className="text-slate-300 mt-1.5 leading-relaxed text-sm">
                    {currentApplication.sessionStartsAt &&
                    new Date(currentApplication.sessionStartsAt).getTime() > Date.now()
                      ? `Your assigned assessments will open on ${formatDateTime(currentApplication.sessionStartsAt)}.`
                      : "Work through the assessments below. Submit each one to progress."}
                  </AlertDescription>
                </Alert>
              )}

              {currentApplication.status === "Soft Locked" && (
                <Alert className="border-amber-500/20 bg-amber-500/5 text-amber-500 rounded-2xl p-5 shadow-inner">
                  <Target className="h-5 w-5 text-amber-500 animate-pulse" aria-hidden="true" />
                  <AlertTitle className="text-lg font-bold tracking-tight">Assessor Unlock Required</AlertTitle>
                  <AlertDescription className="text-slate-300 mt-1.5 leading-relaxed text-sm">
                    <SoftLockTimer sessionStartsAt={currentApplication.sessionStartsAt} />
                  </AlertDescription>
                </Alert>
              )}

              {currentApplication.status === "Completed" && (
                <Alert className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 rounded-2xl p-5 shadow-inner">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                  <AlertTitle className="font-bold text-lg tracking-tight">Process Complete</AlertTitle>
                  <AlertDescription className="text-slate-300 mt-1.5 leading-relaxed text-sm">
                    Your responses have been securely submitted. You do not need to take further action.
                  </AlertDescription>
                </Alert>
              )}

              {/* Assessments Checklist */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2 mb-4">
                  <ClipboardCheck className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  Assessment Journey Map
                </h3>

                {currentAssessmentItems.length > 0 ? (
                  <div className="grid gap-3 relative">
                     {currentAssessmentItems.map((item, index) => (
                       <div key={item.title} className="relative z-10">
                         <AssessmentListItem
                           item={item}
                           step={index + 1}
                           totalSteps={currentAssessmentItems.length}
                         />
                       </div>
                     ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-transparent p-8 text-center text-slate-400">
                    <p>No assessments assigned to this session yet.</p>
                  </div>
                )}
              </div>

              {/* Help Section */}
              <div className="pt-6 border-t border-border dark:border-white/10">
                <Card className="bg-muted/20 border border-border dark:border-white/10 dark:bg-[#0b1220]/30 rounded-2xl shadow-inner">
                  <CardHeader className="pb-3 p-5">
                    <CardTitle className="text-base font-bold">Need Support?</CardTitle>
                    <CardDescription className="text-xs text-slate-400 leading-relaxed">
                      If you encounter technical issues or have questions about the process.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <ContactFormDialog
                      recipient="Hiring Manager"
                      defaultSubject="CTRL Candidate Query"
                      triggerVariant="outline"
                    >
                      <Button
                        variant="outline"
                        className="bg-background dark:bg-transparent border-white/10 shadow-sm hover:!bg-white/10 hover:!text-white transition-colors font-semibold rounded-lg h-10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      >
                        <Mail className="h-4 w-4 mr-2 text-primary" aria-hidden="true" /> Contact Hiring Manager
                      </Button>
                    </ContactFormDialog>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-muted/20 border-border border rounded-[2rem] border-dashed dark:bg-[#0b1329]/20 dark:border-white/10">
            <ClipboardCheck className="h-12 w-12 text-primary/30 mb-4" aria-hidden="true" />
            <p className="text-lg font-bold text-foreground">Select an assessment session</p>
            <p className="max-w-xs mt-2 text-sm">
              Choose a session from the list to view its details and begin your assessments.
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
