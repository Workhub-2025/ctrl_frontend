"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Globe,
  Info,
  Link2,
  ListChecks,
  Lock,
  Mail,
  MapPin,
  PlayCircle,
  RefreshCw,
  Target,
  AlertTriangle,
} from "lucide-react";
import { SecurePreflightModal } from "@/components/assessment/security";
import { AssessmentBriefDialog } from "@/components/dashboard/candidate/assessment-brief-dialog";
import { candidateAssessmentItems } from "@/components/dashboard/candidate-dashboard-data";
import {
  buildSessionContext,
  CandidateEmptyState,
  CandidateEyebrow,
  CandidateLinkSessionPanel,
  CandidateMetaChip,
  CandidatePageHeader,
  CandidatePanel,
  CandidateProgressHeader,
  CandidateSessionListItem,
  CandidateStatusBanner,
} from "@/components/dashboard/candidate/candidate-portal-ui";
import { ContactFormDialog } from "@/components/dashboard/contact-form-dialog";
import { LocationMapDialog } from "@/components/dashboard/location-map-dialog";
import { useCandidatePortal } from "@/context/candidate-portal-provider";
import {
  formatDate,
  formatDateTime,
  getApplicationKey,
  getOutcomeGuidance,
  isActiveStatus,
  pickPrioritySession,
  sortApplications,
  statusBadgeClassName,
  type AssessmentSortOption,
  type CandidateApplicationView,
} from "@/lib/candidate/portal";
import { CandidateSessionService } from "@/services/candidate-session.service";
import { portalIconWrapClass, portalIconWrapLgClass } from "@/components/dashboard/portal/portal-design-tokens";

import { normalizeSlug } from "@/lib/assessment-slug";
import { getAssessmentPagePath } from "@/assessments/plugins/helpers";

function getCandidateAssessmentSlug(
  item: (typeof candidateAssessmentItems)[number]
) {
  return item.slug;
}

function getAssessmentItemsForApplication(application: CandidateApplicationView) {
  if (!application.assessments.length) return [];

  return application.assessments.map((assessment) => {
    const slug = normalizeSlug(assessment.slug);
    const matchedItem = candidateAssessmentItems.find(
      (item) =>
        getCandidateAssessmentSlug(item) === slug ||
        normalizeSlug(item.title) === slug ||
        normalizeSlug(assessment.name) === slug
    );
    const resolvedSlug = slug || matchedItem?.slug || normalizeSlug(assessment.name) || "unknown";

    const isLocked = assessment.status === "locked";
    const isAbandoned = assessment.status === "abandoned";

    return {
      icon: matchedItem?.icon ?? ClipboardCheck,
      title: assessment.name ?? matchedItem?.title ?? "Assessment",
      description: isAbandoned
        ? "This assessment was interrupted. Contact your hiring team before continuing."
        : isLocked
        ? "Waiting for assessor to unlock your session."
        : assessment.status === "not_open"
          ? `Opens${formatDateTime(assessment.availableFrom) ? ` at ${formatDateTime(assessment.availableFrom)}` : " soon"}.`
          : matchedItem?.description ?? "Complete this assigned assessment.",
      duration: matchedItem?.duration,
      href: `${getAssessmentPagePath(resolvedSlug)}?candidateSessionDocumentId=${encodeURIComponent(application.key)}`,
      slug: resolvedSlug,
      isCompleted: assessment.status === "completed",
      isAbandoned,
      isAvailable:
        assessment.isAvailable !== false &&
        assessment.status !== "not_open" &&
        !isLocked &&
        !isAbandoned,
      isLocked,
      availableFromLabel: formatDateTime(assessment.availableFrom),
      completedAt: assessment.completedAt ?? null,
      startsAt: application.sessionStartsAt ?? null,
    };
  });
}

function SoftLockTimer({ sessionStartsAt }: { sessionStartsAt?: string | null }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!sessionStartsAt) return;
    const target = new Date(sessionStartsAt).getTime();
    if (Number.isNaN(target)) return;

    const updateTimer = () => {
      const diff = target - Date.now();
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
    return <>Waiting for your assessor to unlock this session.</>;
  }

  if (timeLeft === "past" || new Date(sessionStartsAt).getTime() <= Date.now()) {
    return (
      <>
        Scheduled start was{" "}
        <span className="font-semibold">{formatDateTime(sessionStartsAt)}</span> —
        waiting for assessor unlock.
      </>
    );
  }

  return (
    <>
      Opens at{" "}
      <span className="font-semibold text-primary">
        {formatDateTime(sessionStartsAt)}
      </span>{" "}
      · unlocks in{" "}
      <span className="font-bold text-primary">
        {timeLeft || "…"}
      </span>
    </>
  );
}

function AssessmentListItem({
  item,
  step,
  totalSteps,
  isLast,
}: {
  item: ReturnType<typeof getAssessmentItemsForApplication>[number];
  step: number;
  totalSteps: number;
  isLast: boolean;
}) {
  const [showBrief, setShowBrief] = useState(false);
  const [showPreflight, setShowPreflight] = useState(false);

  const isCompleted = item.isCompleted;
  const isLocked = item.isLocked;
  const isAbandoned = item.isAbandoned;
  const isAvailable = item.isAvailable;
  const isActive = !isCompleted && isAvailable && !isAbandoned;

  const hasFutureStart = (() => {
    if (!item.startsAt) return false;
    const startTime = new Date(item.startsAt).getTime();
    return !Number.isNaN(startTime) && startTime > Date.now();
  })();

  const Icon = item.icon;

  const nodeClassName = isCompleted
    ? "border-primary bg-primary text-primary-foreground ring-4 ring-primary/15"
    : isActive
      ? "border-primary bg-primary text-primary-foreground ring-4 ring-primary/15"
      : "border-border bg-card text-muted-foreground";

  return (
    <>
      <div className="relative flex gap-4 sm:gap-5">
        <div className="flex w-11 shrink-0 flex-col items-center">
          <span
            className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold tabular-nums ${nodeClassName}`}
            aria-hidden="true"
          >
            {isCompleted ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : isAbandoned ? (
              <AlertTriangle className="h-3.5 w-3.5" />
            ) : isLocked ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              step
            )}
          </span>
          {!isLast ? (
            <span
              className={`mt-1 min-h-6 w-px flex-1 ${
                isCompleted ? "bg-primary/40" : "bg-border dark:bg-white/10"
              }`}
              aria-hidden="true"
            />
          ) : null}
        </div>

        <CandidatePanel
          className={`mb-1 min-w-0 flex-1 ${!isActive && !isCompleted ? "opacity-90" : ""}`}
        >
          <div className="space-y-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={portalIconWrapClass}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h4 className="font-display text-base font-semibold">{item.title}</h4>
                  {isActive ? (
                    <Badge variant="outline" className="border-primary/20 bg-primary/5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      Ready
                    </Badge>
                  ) : null}
                  {isAbandoned ? (
                    <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300">
                      Interrupted
                    </Badge>
                  ) : null}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
                {item.duration ? (
                  <p className="text-xs font-medium text-muted-foreground">
                    Estimated time: {item.duration}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {step} / {totalSteps}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isCompleted ? (
                <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm font-semibold text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                  {item.completedAt
                    ? `Submitted ${formatDate(item.completedAt)}`
                    : "Submitted"}
                </div>
              ) : isAbandoned ? (
                <div className="inline-flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/5 px-3 py-2 text-xs font-semibold text-orange-800 dark:text-orange-200">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  Waiting for unlock — contact your hiring team
                </div>
              ) : isLocked ? (
                <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  Assessor unlock required
                </div>
              ) : hasFutureStart ? (
                <div className="space-y-2">
                  <Button disabled className="h-9 cursor-not-allowed gap-2 opacity-60">
                    <PlayCircle className="h-4 w-4" aria-hidden="true" /> Start
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    <SoftLockTimer sessionStartsAt={item.startsAt} />
                  </p>
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 rounded-lg font-semibold"
                    onClick={() => setShowBrief(true)}
                  >
                    <Info className="h-3.5 w-3.5" aria-hidden="true" />
                    What to expect
                  </Button>
                  <Button
                    onClick={() => setShowBrief(true)}
                    className="h-9 gap-2 font-semibold"
                  >
                    <PlayCircle className="h-4 w-4" aria-hidden="true" /> Start
                  </Button>
                </>
              )}
            </div>
          </div>
        </CandidatePanel>
      </div>

      <AssessmentBriefDialog
        assessment={{
          title: item.title,
          description: item.description,
          duration: item.duration,
          icon: item.icon,
          href: item.href,
        }}
        open={showBrief}
        onOpenChange={setShowBrief}
        onStart={() => setShowPreflight(true)}
      />

      <SecurePreflightModal
        isOpen={showPreflight}
        onClose={() => setShowPreflight(false)}
        assessmentName={item.title}
        href={item.href}
      />
    </>
  );
}

function SessionModeMetaChip({ application }: { application: CandidateApplicationView }) {
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const isRemote = application.mode === "remote";
  const isInPerson = application.mode === "in_person";

  if (isRemote) {
    return (
      <CandidateMetaChip icon={Globe} label="Mode" value="Remote" />
    );
  }

  if (isInPerson) {
    return (
      <>
        <button
          type="button"
          onClick={() => setLocationDialogOpen(true)}
          className="flex min-w-0 flex-col gap-0.5 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-primary/30"
        >
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
            Location
          </span>
          <span className="truncate text-sm font-medium text-foreground">
            {application.location || "View venue"}
          </span>
        </button>
        <LocationMapDialog
          address={
            application.location === "Location to be confirmed"
              ? ""
              : application.location
          }
          open={locationDialogOpen}
          onOpenChange={setLocationDialogOpen}
        />
      </>
    );
  }

  return (
    <CandidateMetaChip icon={Target} label="Mode" value={application.modeLabel} />
  );
}

function DetailSubtitle({ application }: { application: CandidateApplicationView }) {
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const isRemote = application.mode === "remote";
  const isInPerson = application.mode === "in_person";

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
      <span className="font-semibold text-foreground/85">{application.role}</span>
      {isRemote ? (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-0.5 text-xs">
          <Globe className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Remote
        </span>
      ) : isInPerson ? (
        <>
          <button
            type="button"
            onClick={() => setLocationDialogOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-0.5 text-xs transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {application.location || "View venue"}
          </button>
          <LocationMapDialog
            address={
              application.location === "Location to be confirmed"
                ? ""
                : application.location
            }
            open={locationDialogOpen}
            onOpenChange={setLocationDialogOpen}
          />
        </>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-0.5 text-xs">
          <Target className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          {application.modeLabel}
        </span>
      )}
    </div>
  );
}

function SessionListItemSkeleton() {
  return (
    <div className="motion-safe:animate-pulse space-y-3 rounded-xl border border-border/70 bg-card p-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-1.5 w-full rounded-full" />
    </div>
  );
}

export function CandidateAssessmentsLoadingSkeleton() {
  return (
    <div className="max-w-7xl space-y-6 motion-safe:animate-pulse" aria-busy="true">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="flex flex-col gap-6 lg:flex-row">
        <Skeleton className="h-[480px] w-full rounded-2xl lg:w-[400px]" />
        <Skeleton className="hidden h-[480px] flex-1 rounded-2xl lg:block" />
      </div>
    </div>
  );
}

export function CandidateDashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get("session");

  const {
    applications,
    isLoading,
    isRefreshing,
    error,
    lastRefreshAt,
    refresh,
  } = useCandidatePortal();

  const [selectedApplicationKey, setSelectedApplicationKey] = useState<string | null>(
    sessionParam
  );
  const [sortBy, setSortBy] = useState<AssessmentSortOption>("attention");
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [isJoinSubmitting, setIsJoinSubmitting] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");

  useEffect(() => {
    setSelectedApplicationKey(sessionParam);
  }, [sessionParam]);

  const updateSelection = useCallback(
    (key: string | null) => {
      setSelectedApplicationKey(key);
      const query = key ? `?session=${encodeURIComponent(key)}` : "";
      router.replace(`${pathname}${query}`, { scroll: false });
    },
    [router, pathname]
  );

  const sortedApplications = useMemo(
    () => sortApplications(applications, sortBy),
    [applications, sortBy]
  );

  useEffect(() => {
    if (isLoading) return;
    if (
      selectedApplicationKey &&
      !applications.some((app) => app.key === selectedApplicationKey)
    ) {
      updateSelection(null);
    } else if (!selectedApplicationKey && applications.length > 0) {
      const activeApps = applications.filter((app) => isActiveStatus(app.status));
      const priorityApp = pickPrioritySession(activeApps) ?? applications[0];
      if (priorityApp) {
        updateSelection(priorityApp.key);
      }
    }
  }, [applications, isLoading, selectedApplicationKey, updateSelection]);

  const currentApplication = applications.find(
    (app) => app.key === selectedApplicationKey
  );
  const currentAssessmentItems = currentApplication
    ? getAssessmentItemsForApplication(currentApplication)
    : [];
  const sessionContext = currentApplication
    ? buildSessionContext(currentApplication)
    : undefined;

  const updatedLabel = lastRefreshAt
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(lastRefreshAt))
    : null;

  const handleJoinWithAccessCode = async (event: FormEvent) => {
    event.preventDefault();
    const code = accessCodeInput.trim();
    if (!code) {
      setJoinError("Please enter an Access Code.");
      return;
    }
    setIsJoinSubmitting(true);
    setJoinError("");
    setJoinSuccess("");
    try {
      const joined = await CandidateSessionService.joinWithAccessCode(code);
      await refresh({ force: true });
      const joinedKey = joined ? getApplicationKey(joined) : "";
      if (joinedKey) updateSelection(joinedKey);
      setJoinSuccess("Session linked successfully.");
      setAccessCodeInput("");
    } catch (err) {
      setJoinError(
        err instanceof Error
          ? err.message
          : "Invalid Access Code. Please check and try again."
      );
    } finally {
      setIsJoinSubmitting(false);
    }
  };

  if (error && applications.length === 0) {
    return (
      <div className="max-w-3xl p-2">
        <Alert className="rounded-2xl border-destructive/30 bg-destructive/5 text-destructive">
          <AlertTitle className="font-bold">Assessments unavailable</AlertTitle>
          <AlertDescription className="text-sm leading-relaxed">
            {error}
            <div className="mt-4">
              <Button variant="outline" onClick={() => void refresh({ force: true })} disabled={isRefreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "motion-safe:animate-spin" : ""}`} />
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading && applications.length === 0) {
    return <CandidateAssessmentsLoadingSkeleton />;
  }

  if (applications.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <CandidatePageHeader
          eyebrow="My Assessments"
          title="Assessment workspace"
          description="Link a session, then work through each assigned task in order."
          icon={Briefcase}
        />
        <CandidateEmptyState
          icon={Link2}
          title="No sessions linked yet"
          description="Enter the Access Code from your hiring manager to connect your assessment session."
          action={
            <CandidateLinkSessionPanel
              compactTitle="Link your first session"
              value={accessCodeInput}
              onChange={setAccessCodeInput}
              onSubmit={(event) => void handleJoinWithAccessCode(event)}
              isSubmitting={isJoinSubmitting}
              error={joinError}
              success={joinSuccess}
            />
          }
        />
      </div>
    );
  }

  const showListOnMobile = !selectedApplicationKey;
  const showDetailOnMobile = !!selectedApplicationKey;
  const outcome = currentApplication
    ? currentApplication.completedCount >= currentApplication.totalCount &&
      currentApplication.totalCount > 0
      ? getOutcomeGuidance("Completed")
      : getOutcomeGuidance(currentApplication.status)
    : null;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className={selectedApplicationKey ? "hidden lg:block" : "block"}>
        <CandidatePageHeader
          eyebrow="My Assessments"
          title="Assessment workspace"
          description="Select a session to view details, track progress, and start your assigned tasks."
          icon={Briefcase}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refresh({ force: true })}
              disabled={isRefreshing}
              className="h-9 gap-2 rounded-xl font-semibold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "motion-safe:animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        />
      </div>

      <div className="flex w-full min-h-[calc(100vh-6rem)] flex-col gap-6 lg:flex-row">
        <div
          className={`flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-[5.5rem] lg:max-h-[calc(100vh-8rem)] lg:w-[380px] lg:self-start xl:w-[420px] ${
            showListOnMobile ? "flex" : "hidden lg:flex"
          }`}
        >
          <CandidatePanel className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3 dark:border-white/5">
              <CandidateEyebrow className="normal-case tracking-[0.12em]">
                Sessions ({applications.length})
              </CandidateEyebrow>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as AssessmentSortOption)}>
                <SelectTrigger aria-label="Sort sessions" className="h-9 w-[170px] rounded-xl text-xs">
                  <ArrowUpDown className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="attention">Action required</SelectItem>
                  <SelectItem value="due_closest">Due date</SelectItem>
                  <SelectItem value="newest">Recently linked</SelectItem>
                  <SelectItem value="name_az">A–Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {updatedLabel ? (
              <p className="px-4 pt-2 text-[11px] text-muted-foreground">
                Updated {updatedLabel}
              </p>
            ) : null}

            <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-4 pt-3">
              {isLoading
                ? [0, 1, 2].map((i) => <SessionListItemSkeleton key={i} />)
                : sortedApplications.map((app) => (
                    <CandidateSessionListItem
                      key={app.key}
                      app={app}
                      isSelected={app.key === selectedApplicationKey}
                      onSelect={() => updateSelection(app.key)}
                    />
                  ))}
            </div>
          </CandidatePanel>

          <CandidateLinkSessionPanel
            compactTitle="Link another session"
            value={accessCodeInput}
            onChange={setAccessCodeInput}
            onSubmit={(event) => void handleJoinWithAccessCode(event)}
            isSubmitting={isJoinSubmitting}
            error={joinError}
            success={joinSuccess}
          />
        </div>

        <div className={`min-w-0 flex-1 ${showDetailOnMobile ? "block" : "hidden lg:block"}`}>
          {currentApplication ? (
            <CandidatePanel className="flex flex-col overflow-hidden motion-safe:animate-in motion-safe:fade-in">
              <div className="border-b border-border/60 bg-muted/15 px-5 py-5 sm:px-6 dark:border-white/5">
                <Button
                  variant="ghost"
                  className="-ml-2 mb-3 lg:hidden"
                  onClick={() => updateSelection(null)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to sessions
                </Button>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                        {currentApplication.campaign}
                      </h2>
                      <DetailSubtitle application={currentApplication} />
                    </div>
                    <span className={statusBadgeClassName(currentApplication.status)}>
                      {currentApplication.status}
                    </span>
                  </div>

                  <CandidateProgressHeader
                    completed={currentApplication.completedCount}
                    total={currentApplication.totalCount}
                    percent={currentApplication.completionPercent}
                  />

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {currentApplication.linkedAt ? (
                      <CandidateMetaChip icon={Link2} label="Linked" value={formatDate(currentApplication.linkedAt)} />
                    ) : null}
                    {currentApplication.assessmentSessionName ? (
                      <CandidateMetaChip icon={ClipboardList} label="Session" value={currentApplication.assessmentSessionName} />
                    ) : null}
                    {currentApplication.expiresAt ? (
                      <CandidateMetaChip icon={Clock} label="Expires" value={formatDateTime(currentApplication.expiresAt) ?? "—"} />
                    ) : null}
                    <SessionModeMetaChip application={currentApplication} />
                  </div>
                </div>
              </div>

              <div className="custom-scrollbar space-y-6 overflow-y-auto p-5 sm:p-6">
                {outcome ? (
                  <CandidateStatusBanner status={currentApplication.status} title={outcome.title}>
                    {currentApplication.status === "Soft Locked" ? (
                      <SoftLockTimer sessionStartsAt={currentApplication.sessionStartsAt} />
                    ) : currentApplication.status === "Completed" && currentApplication.completedAt ? (
                      <>
                        {outcome.body} Submitted on{" "}
                        {formatDate(currentApplication.completedAt)}.
                      </>
                    ) : (
                      outcome.body
                    )}
                  </CandidateStatusBanner>
                ) : null}

                <div className="space-y-3">
                  <div className="space-y-1">
                    <CandidateEyebrow>Assessment journey</CandidateEyebrow>
                    <h3 className="font-display text-lg font-semibold">Your assigned tasks</h3>
                    <p className="text-sm text-muted-foreground">
                      Complete each assessment in order. Tap &ldquo;What to expect&rdquo; for
                      duration and setup guidance before you start.
                    </p>
                  </div>

                  {currentAssessmentItems.length > 0 ? (
                    <div className="space-y-1">
                      {currentAssessmentItems.map((item, index) => (
                        <AssessmentListItem
                          key={item.slug || item.href}
                          item={item}
                          step={index + 1}
                          totalSteps={currentAssessmentItems.length}
                          isLast={index === currentAssessmentItems.length - 1}
                        />
                      ))}
                    </div>
                  ) : (
                    <CandidateEmptyState
                      icon={ListChecks}
                      title="No assessments assigned"
                      description="This session doesn't have any tasks yet. Contact your hiring manager if this looks wrong."
                    />
                  )}
                </div>

                <CandidatePanel className="border-dashed">
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className={portalIconWrapLgClass}>
                        <Mail className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                          Session support
                        </p>
                        <h3 className="font-display text-base font-semibold">
                          Questions about this session?
                        </h3>
                        <p className="max-w-md text-sm text-muted-foreground">
                          Message your hiring team — your session details are attached
                          automatically.
                        </p>
                      </div>
                    </div>
                    <ContactFormDialog
                      recipient="Hiring Manager"
                      defaultSubject={`Query: ${currentApplication.campaign}`}
                      sessionContext={sessionContext}
                      triggerVariant="outline"
                    >
                      <Button variant="outline" className="h-10 shrink-0 gap-2 rounded-xl font-semibold">
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        Message hiring team
                      </Button>
                    </ContactFormDialog>
                  </div>
                </CandidatePanel>
              </div>
            </CandidatePanel>
          ) : (
            <CandidatePanel className="flex min-h-[320px] items-center justify-center p-6">
              <CandidateEmptyState
                icon={Briefcase}
                title="Select a session"
                description="Choose a linked session from the list to view your assessment journey."
              />
            </CandidatePanel>
          )}
        </div>
      </div>
    </div>
  );
}
