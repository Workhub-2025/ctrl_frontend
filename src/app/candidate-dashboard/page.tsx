"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useCandidatePortal } from "@/context/candidate-portal-provider";
import {
  formatDate,
  hasAvailableAssessment,
  isActiveStatus,
  pickPrioritySession,
  statusBadgeClassName,
  type CandidateApplicationView,
} from "@/lib/candidate/portal";
import { CandidateSessionService } from "@/services/candidate-session.service";
import {
  CandidateEmptyState,
  CandidateLinkSessionPanel,
  CandidateMetaChip,
  CandidatePageHeader,
  CandidatePanel,
  CandidateProgressHeader,
  CandidateQuickLink,
  CandidateSectionHeader,
  CandidateStatTile,
} from "@/components/dashboard/candidate/candidate-portal-ui";
import { portalAlertErrorClass } from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Globe,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  MapPin,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";

function getActiveDateMeta(app: CandidateApplicationView) {
  if (!app) return null;
  if (app.sessionStartsAt) {
    return { label: "Starts", value: formatDate(app.sessionStartsAt) };
  }
  const campaignEnd = app.raw.campaign?.endDate;
  if (campaignEnd) {
    return { label: "Due", value: formatDate(campaignEnd) };
  }
  if (app.expiresAt) {
    return { label: "Expires", value: formatDate(app.expiresAt) };
  }
  return null;
}

function assessmentHrefFor(key: string) {
  return `/candidate-dashboard/my-assessments?session=${encodeURIComponent(key)}`;
}

function StatTileSkeleton() {
  return (
    <CandidatePanel className="animate-pulse">
      <div className="space-y-3 p-5">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-8 w-16 rounded bg-muted" />
        <div className="h-3 w-28 rounded bg-muted" />
      </div>
    </CandidatePanel>
  );
}

export default function CandidateDashboardOverviewPage() {
  const { user } = useAuth();
  const { userProfile } = useAuthStore();
  const { applications, isLoading, error, refresh } = useCandidatePortal();

  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");

  const displayName = userProfile
    ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim() ||
      userProfile.email ||
      "Candidate"
    : user?.name || "Candidate";
  const firstName = displayName.split(" ")[0];

  const activeApps = useMemo(
    () => applications.filter((app) => isActiveStatus(app.status)),
    [applications]
  );
  const pastApps = useMemo(
    () => applications.filter((app) => !isActiveStatus(app.status)),
    [applications]
  );

  const nextUpApp = useMemo(
    () => pickPrioritySession(activeApps.filter(hasAvailableAssessment)) ?? pickPrioritySession(activeApps),
    [activeApps]
  );

  const stats = useMemo(() => {
    const awaitingAction = activeApps.filter(hasAvailableAssessment).length;
    const submitted = applications.reduce((sum, app) => sum + app.completedCount, 0);
    const totalTasks = applications.reduce((sum, app) => sum + app.totalCount, 0);
    return {
      active: activeApps.length,
      awaitingAction,
      submitted,
      totalTasks,
      completed: pastApps.length,
    };
  }, [applications, activeApps, pastApps]);

  const handleJoin = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = accessCodeInput.trim();
    if (!code) {
      setJoinError("Please enter an Access Code.");
      return;
    }
    setIsSubmitting(true);
    setJoinError("");
    setJoinSuccess("");
    try {
      await CandidateSessionService.joinWithAccessCode(code);
      await refresh({ force: true });
      setJoinSuccess("Session linked successfully.");
      setAccessCodeInput("");
    } catch (err) {
      setJoinError(
        err instanceof Error
          ? err.message
          : "Invalid Access Code. Please check and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasAnySessions = applications.length > 0;
  const orientationDescription = !hasAnySessions
    ? "Link your first assessment session with the Access Code from your hiring team, then complete each assigned task at your own pace."
    : stats.awaitingAction > 0
      ? "You have assessments ready to work on. Continue your session or link another Access Code below."
      : activeApps.length > 0
        ? "Your active sessions are below. Check back for unlocks or new tasks from your hiring team."
        : "All current sessions are complete. Link a new Access Code if you've been invited to another assessment.";

  const statTiles = [
    {
      label: "Active sessions",
      value: stats.active,
      detail: stats.active === 1 ? "in progress" : "in progress",
      icon: Target,
      tone: "default" as const,
    },
    {
      label: "Ready to start",
      value: stats.awaitingAction,
      detail: stats.awaitingAction > 0 ? "needs your action" : "nothing waiting",
      icon: AlertTriangle,
      tone: stats.awaitingAction > 0 ? ("attention" as const) : ("default" as const),
    },
    {
      label: "Submitted",
      value: stats.submitted,
      detail: stats.totalTasks > 0 ? `of ${stats.totalTasks} assigned` : "none yet",
      icon: ListChecks,
      tone: "default" as const,
    },
    {
      label: "Finished",
      value: stats.completed,
      detail: stats.completed === 1 ? "session closed" : "sessions closed",
      icon: CheckCircle2,
      tone: stats.completed > 0 ? ("success" as const) : ("default" as const),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 pb-12 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      {error ? (
        <div
          role="alert"
          className={cn(portalAlertErrorClass, "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between")}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Couldn&apos;t load your sessions</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => void refresh({ force: true })}
            className="shrink-0 gap-2 font-semibold"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry
          </Button>
        </div>
      ) : null}

      <CandidatePageHeader
        eyebrow="Overview"
        title={`Welcome back, ${firstName}`}
        description={orientationDescription}
        icon={LayoutDashboard}
        action={
          nextUpApp ? (
            <Button asChild className="h-10 gap-2 rounded-xl font-semibold">
              <Link href={assessmentHrefFor(nextUpApp.key)}>
                {hasAvailableAssessment(nextUpApp) ? "Continue assessments" : "View session"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : null
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? [0, 1, 2, 3].map((i) => <StatTileSkeleton key={i} />)
          : statTiles.map((tile) => (
              <CandidateStatTile key={tile.label} {...tile} />
            ))}
      </section>

      {!isLoading && nextUpApp && hasAvailableAssessment(nextUpApp) ? (
        <CandidatePanel>
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0 space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                  Your next task
                </p>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  {nextUpApp.campaign}
                </h2>
                <p className="text-sm text-muted-foreground">{nextUpApp.role}</p>
              </div>
              <CandidateProgressHeader
                completed={nextUpApp.completedCount}
                total={nextUpApp.totalCount}
                percent={nextUpApp.completionPercent}
              />
            </div>
            <Button asChild className="h-11 shrink-0 gap-2 rounded-xl px-8 font-semibold">
              <Link href={assessmentHrefFor(nextUpApp.key)}>
                {nextUpApp.completedCount > 0 ? "Continue" : "Start now"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </CandidatePanel>
      ) : null}

      {!hasAnySessions && !isLoading ? (
        <section className="space-y-6">
          <CandidateEmptyState
            icon={KeyRound}
            title="No sessions linked yet"
            description="Enter the Access Code from your hiring manager to connect your first assessment session."
            action={
              <div className="w-full max-w-md">
                <CandidateLinkSessionPanel
                  compactTitle="Link your first session"
                  value={accessCodeInput}
                  onChange={setAccessCodeInput}
                  onSubmit={handleJoin}
                  isSubmitting={isSubmitting}
                  error={joinError}
                  success={joinSuccess}
                />
              </div>
            }
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: KeyRound, title: "Join", copy: "Link your session with a single-use Access Code." },
              { icon: ClipboardCheck, title: "Complete", copy: "Work through each assigned assessment in order." },
              { icon: Sparkles, title: "Outcome", copy: "Your hiring team reviews submissions and follows up." },
            ].map((step, index) => (
              <CandidatePanel key={step.title}>
                <div className="flex items-start gap-3 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <step.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="space-y-1">
                    <p className="font-display text-sm font-semibold">
                      {index + 1}. {step.title}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">{step.copy}</p>
                  </div>
                </div>
              </CandidatePanel>
            ))}
          </div>
        </section>
      ) : null}

      {hasAnySessions ? (
        <section className="space-y-5">
          <CandidateSectionHeader
            eyebrow="Active"
            title="Sessions in progress"
            description="Open a session to view your assessment journey and start tasks."
            action={
              activeApps.length > 0 ? (
                <CandidateQuickLink href="/candidate-dashboard/my-assessments">
                  Open workspace <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </CandidateQuickLink>
              ) : null
            }
          />

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[0, 1].map((i) => (
                <CandidatePanel key={i}>
                  <div className="h-40 animate-pulse bg-muted/20" />
                </CandidatePanel>
              ))}
            </div>
          ) : activeApps.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {activeApps.map((app) => {
                const dateMeta = getActiveDateMeta(app);
                const modeLabel =
                  app.mode === "remote"
                    ? "Remote"
                    : app.mode === "in_person"
                      ? app.location
                      : app.modeLabel;

                return (
                  <CandidatePanel key={app.key}>
                    <div className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="line-clamp-1 font-display text-lg font-semibold">
                            {app.campaign}
                          </h3>
                          <p className="truncate text-sm text-muted-foreground">{app.role}</p>
                        </div>
                        <span className={`${statusBadgeClassName(app.status)} shrink-0`}>
                          {app.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {dateMeta ? (
                          <CandidateMetaChip
                            icon={CalendarClock}
                            label={dateMeta.label}
                            value={dateMeta.value}
                          />
                        ) : null}
                        <CandidateMetaChip
                          icon={app.mode === "remote" ? Globe : MapPin}
                          label="Mode"
                          value={modeLabel}
                        />
                      </div>

                      <CandidateProgressHeader
                        completed={app.completedCount}
                        total={app.totalCount}
                        percent={app.completionPercent}
                      />

                      <Button asChild variant={hasAvailableAssessment(app) ? "default" : "outline"} className="w-full gap-2 rounded-xl font-semibold">
                        <Link href={assessmentHrefFor(app.key)}>
                          {hasAvailableAssessment(app) ? "Continue" : "View session"}
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </Button>
                    </div>
                  </CandidatePanel>
                );
              })}
            </div>
          ) : (
            <CandidateEmptyState
              icon={Briefcase}
              title="No active sessions"
              description="Your current sessions are complete or awaiting review. Link a new Access Code if you've been invited to another assessment."
            />
          )}
        </section>
      ) : null}

      {hasAnySessions && !isLoading ? (
        <CandidateLinkSessionPanel
          value={accessCodeInput}
          onChange={setAccessCodeInput}
          onSubmit={handleJoin}
          isSubmitting={isSubmitting}
          error={joinError}
          success={joinSuccess}
        />
      ) : null}

      {pastApps.length > 0 ? (
        <section className="space-y-5 border-t border-border/60 pt-8 dark:border-white/5">
          <CandidateSectionHeader
            eyebrow="History"
            title="Past sessions"
            description={`${pastApps.length} completed or closed session${pastApps.length !== 1 ? "s" : ""}.`}
          />

          <CandidatePanel>
            <ul className="divide-y divide-border/60 dark:divide-white/5">
              {pastApps.map((app) => (
                <li key={app.key}>
                  <Link
                    href={assessmentHrefFor(app.key)}
                    className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="line-clamp-1 font-display text-sm font-semibold group-hover:text-primary">
                          {app.campaign}
                        </h3>
                        <span className={`${statusBadgeClassName(app.status)} shrink-0`}>
                          {app.status}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{app.role}</p>
                    </div>
                    <div className="hidden shrink-0 text-right text-xs sm:block">
                      <p className="font-semibold tabular-nums">
                        {app.completedCount}/{app.totalCount}
                      </p>
                      {app.completedAt ? (
                        <p className="text-muted-foreground">
                          {formatDate(app.completedAt)}
                        </p>
                      ) : null}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </CandidatePanel>
        </section>
      ) : null}
    </div>
  );
}
