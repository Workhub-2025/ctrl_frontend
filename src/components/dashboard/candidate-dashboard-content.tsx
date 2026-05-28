"use client";

import { useCallback, useEffect, useState } from "react";
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
  ArrowLeft,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Target,
  XCircle,
} from "lucide-react";
import { AssessmentCard } from "@/components/dashboard/assessment-card";
import { candidateAssessmentItems } from "@/components/dashboard/candidate-dashboard-data";
import {
  CandidateSessionService,
  type CandidatePortalApplication,
  type CandidatePortalAssessment,
} from "@/services/candidate-session.service";

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
  status: CandidateApplicationStatus;
  location: string;
  mode: string;
  completion: string;
  completedCount: number;
  totalCount: number;
  completionPercent: number;
  assessments: CandidatePortalAssessment[];
};

const statusClassNames: Record<CandidateApplicationStatus, string> = {
  "Awaiting Assessment":
    "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  "In Progress":
    "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  Completed:
    "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  Progressed:
    "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400",
  Unsuccessful:
    "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
  "Soft Locked":
    "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400",
};

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

function mapApplication(
  application: CandidatePortalApplication
): CandidateApplication {
  const completed = application.completion?.completed ?? 0;
  const total = application.completion?.total ?? application.assessments?.length ?? 0;
  const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    key: application.documentId ?? application.candidateCode ?? crypto.randomUUID(),
    code: application.candidateCode ?? application.documentId ?? "Access Code linked",
    campaign: application.campaign?.name ?? "Campaign",
    role: application.campaign?.jobRole ?? "Candidate assessment",
    date: formatDate(application.campaign?.endDate ?? application.expiresAt),
    status: mapPortalStatus(application),
    location: application.campaign?.location ?? application.mode ?? "Location to be confirmed",
    mode: formatMode(application.mode),
    completion:
      total > 0
        ? `${completed} of ${total} assessments submitted`
        : "No assessments assigned yet",
    completedCount: completed,
    totalCount: total,
    completionPercent,
    assessments: application.assessments ?? [],
  };
}

function formatMode(value?: string | null) {
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

function normaliseSlug(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .replace(/_/g, "-")
    .replace("prioritisation", "prioritization");
}

function getCandidateAssessmentSlug(item: (typeof candidateAssessmentItems)[number]) {
  return normaliseSlug(item.href.split("/").pop());
}

function getAssessmentItemsForApplication(application: CandidateApplication) {
  if (!application.assessments.length) {
    return [];
  }

  return application.assessments.map((assessment) => {
    const slug = normaliseSlug(assessment.slug);
    const matchedItem = candidateAssessmentItems.find(
      (item) =>
        getCandidateAssessmentSlug(item) === slug ||
        normaliseSlug(item.title) === slug ||
        normaliseSlug(item.title) === normaliseSlug(assessment.name)
    );

    return {
      icon: matchedItem?.icon ?? ClipboardCheck,
      title: assessment.name ?? matchedItem?.title ?? "Assessment",
      description:
        matchedItem?.description ?? "Complete this assigned assessment.",
      href: matchedItem?.href ?? `/assessment/${slug}`,
      isCompleted: assessment.status === "completed",
    };
  });
}

export function CandidateDashboardContent() {
  const [selectedApplicationKey, setSelectedApplicationKey] = useState<
    string | null
  >(null);
  const [isPairingNew, setIsPairingNew] = useState(false);
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(
    CandidateSessionService.getMyApplicationsLastRefresh()
  );

  const loadApplications = useCallback(async (options?: { force?: boolean }) => {
    const isManualRefresh = !!options?.force;
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setLoadError("");

    try {
      const portalApplications =
        await CandidateSessionService.getMyApplications({
          force: options?.force,
        });
      const mappedApplications = portalApplications.map(mapApplication);

      setApplications(mappedApplications);
      setLastRefreshAt(CandidateSessionService.getMyApplicationsLastRefresh());
      setSelectedApplicationKey((currentKey) =>
        currentKey &&
        mappedApplications.some((application) => application.key === currentKey)
          ? currentKey
          : null
      );
    } catch (applicationError) {
      console.error("[CandidateDashboard] Failed to load applications:", applicationError);
      setLoadError(
        "We could not load your campaigns. Please refresh or try again shortly."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();

    const code = accessCodeInput.trim();
    if (!code) {
      setError("Enter the Access Code provided by your Hiring Manager.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await CandidateSessionService.joinWithAccessCode(code);
      const portalApplications =
        await CandidateSessionService.getMyApplications({ force: true });
      const mappedApplications = portalApplications.map(mapApplication);
      const matchingApplication = mappedApplications.find(
        (application) => application.code === code
      );

      setApplications(mappedApplications);
      setLastRefreshAt(CandidateSessionService.getMyApplicationsLastRefresh());
      setSelectedApplicationKey(
        matchingApplication?.key ?? mappedApplications[0]?.key ?? null
      );
      setIsPairingNew(false);
      setAccessCodeInput("");
    } catch (pairingError) {
      const message =
        pairingError instanceof Error
          ? pairingError.message
          : "Invalid Access Code. Please check the code provided by your Hiring Manager.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentApplication = applications.find(
    (application) => application.key === selectedApplicationKey
  );
  const currentAssessmentItems = currentApplication
    ? getAssessmentItemsForApplication(currentApplication)
    : [];

  if (!selectedApplicationKey || !currentApplication) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <section className="overflow-hidden rounded-[1.5rem] border border-primary/15 bg-card shadow-md shadow-primary/5 ring-1 ring-primary/5 dark:border-white/10 dark:bg-[#080c16] dark:shadow-black/20">
          <div className="relative grid gap-0 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="relative z-10 space-y-6 p-6 sm:p-7">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold font-headline text-foreground sm:text-4xl lg:text-5xl">
                  My Campaigns
                </h1>
                <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                  Join campaign sessions, complete assigned assessments, and keep track of what has already been submitted.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 shadow-sm dark:border-white/5 dark:bg-white/[0.04]">
                  <Briefcase className="h-4 w-4 text-primary" />
                  {applications.length} campaign{applications.length === 1 ? "" : "s"} linked
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 shadow-sm dark:border-white/5 dark:bg-white/[0.04]">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  Last refresh: {formatRefreshTime(lastRefreshAt)}
                </span>
              </div>
            </div>
            <div className="relative z-10 flex flex-col justify-end border-t border-border bg-muted/50 p-6 dark:border-white/5 dark:bg-white/[0.04] lg:border-l lg:border-t-0">
              <div
                className={`mt-auto flex flex-col ${
                  isPairingNew ? "gap-2" : "gap-0"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void loadApplications({ force: true })}
                    disabled={isLoading || isRefreshing}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Button
                    onClick={() => setIsPairingNew(!isPairingNew)}
                    className="gap-2"
                    aria-expanded={isPairingNew}
                    aria-controls="candidate-access-code-panel"
                  >
                    Enter Access Code
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-300 ${
                        isPairingNew ? "rotate-180" : ""
                      }`}
                    />
                  </Button>
                </div>
                <div
                  id="candidate-access-code-panel"
                  className={`grid transition-all duration-300 ease-out ${
                    isPairingNew
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <form
                      onSubmit={handlePair}
                      className="rounded-2xl border border-border bg-background/80 p-3 shadow-sm dark:border-white/5 dark:bg-[#04070d]/80"
                    >
                      <div className="space-y-3">
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="code"
                            aria-label="Access Code"
                            value={accessCodeInput}
                            onChange={(e) => setAccessCodeInput(e.target.value)}
                            placeholder="e.g. CTRL-9A2X"
                            className="h-11 font-mono tracking-wider pl-10"
                          />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button
                          type="submit"
                          className="h-11 w-full"
                          disabled={!accessCodeInput.trim() || isSubmitting}
                        >
                          {isSubmitting && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Join Campaign
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {loadError && (
          <Alert className="border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400">
            <AlertTitle>Campaigns unavailable</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <Card className="border-border bg-card shadow-sm dark:border-white/5 dark:bg-[#080c16]/50 dark:shadow-none">
            <CardContent className="flex items-center gap-3 p-6 text-muted-foreground">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
              <div>
                <p className="font-medium text-foreground">Loading campaigns</p>
                <p className="text-sm text-muted-foreground">
                  Checking whether any campaign sessions are linked to your account.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : applications.length === 0 ? (
          <Card className="overflow-hidden border-border bg-card shadow-sm dark:border-white/5 dark:bg-[#080c16]/50 dark:shadow-none">
            <CardContent className="relative grid gap-5 p-6 md:grid-cols-[auto_1fr] md:items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Briefcase className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-xl">No campaigns linked yet</CardTitle>
                <CardDescription className="max-w-2xl">
                  Once you receive an Access Code from a Hiring Manager, use the panel above to link the campaign to this portal. Linked campaigns will appear here with their location, mode, assessment progress, and submission status.
                </CardDescription>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {applications.map((application) => (
              <Card
                key={application.key}
                className="group cursor-pointer overflow-hidden border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md dark:border-white/5 dark:bg-[#080c16]/70 dark:hover:bg-[#0b1120]"
                onClick={() => setSelectedApplicationKey(application.key)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-lg">{application.campaign}</CardTitle>
                        <CardDescription className="mt-1 text-sm">{application.role}</CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={statusClassNames[application.status]}
                    >
                      {application.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl bg-muted/60 p-3 dark:bg-white/[0.03]">
                      <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" /> Date
                      </div>
                      <p className="text-foreground">{application.date}</p>
                    </div>
                    <div className="rounded-xl bg-muted/60 p-3 dark:bg-white/[0.03]">
                      <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> Location
                      </div>
                      <p className="text-foreground">{application.location}</p>
                    </div>
                    <div className="rounded-xl bg-muted/60 p-3 dark:bg-white/[0.03]">
                      <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Target className="h-3.5 w-3.5" /> Mode
                      </div>
                      <p className="text-foreground">{application.mode}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-foreground">Assessment progress</span>
                      <span>{application.completion}</span>
                    </div>
                    <Progress value={application.completionPercent} className="h-2 bg-muted dark:bg-white/10" />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 dark:border-white/5">
                    <span className="font-mono text-xs text-muted-foreground">{application.code}</span>
                    <span className="inline-flex items-center gap-2 font-medium text-primary">
                      {application.status === "Awaiting Assessment" ||
                      application.status === "In Progress"
                        ? "Open campaign"
                        : "View campaign"}
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="gap-2 px-0 text-muted-foreground hover:text-foreground"
            onClick={() => setSelectedApplicationKey(null)}
          >
            <ArrowLeft className="h-4 w-4" />
            Return to My Campaigns
          </Button>
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
            Access Code: {currentApplication.code}
          </Badge>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold font-headline leading-tight text-foreground">
            {currentApplication.campaign}
          </h1>
          <p className="text-sm font-medium text-muted-foreground">{currentApplication.role}</p>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            {currentApplication.status === "Awaiting Assessment"
              ? "Your account is linked to this campaign. Begin each assigned assessment when you are ready."
              : "This campaign has concluded. You can review your completion status below."}
          </p>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 dark:bg-white/5">
              <Target className="h-4 w-4 text-primary" />
              {currentApplication.mode}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 dark:bg-white/5">
              <Clock className="h-4 w-4 text-primary" />
              {currentApplication.completion}
            </span>
          </div>
        </div>
      </section>

      <div className={`grid gap-6 ${currentApplication.status !== "Awaiting Assessment" && currentApplication.status !== "In Progress" ? "lg:grid-cols-[1.5fr_1fr]" : ""}`}>
        <div className="space-y-6">
          {(currentApplication.status === "Awaiting Assessment" || currentApplication.status === "In Progress") && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <Alert className="border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400">
                <CheckCircle2 className="h-5 w-5 !text-blue-700 dark:!text-blue-400" />
                <AlertTitle className="text-blue-800 dark:text-blue-300">Awaiting Assessment</AlertTitle>
                <AlertDescription className="text-blue-700/80 dark:text-blue-400/80">
                  Your assigned assessments are available. Start each assessment when you are ready and submit all sections for review.
                </AlertDescription>
              </Alert>
              {currentAssessmentItems.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {currentAssessmentItems.map((item) => (
                    <AssessmentCard
                      key={item.title}
                      title={item.title}
                      description={item.description}
                      icon={<item.icon className="h-6 w-6" />}
                      href={item.href}
                      isCompleted={item.isCompleted}
                    />
                  ))}
                </div>
              ) : (
                <Card className="border-border dark:border-white/5 bg-card dark:bg-[#080c16]/50 shadow-sm dark:shadow-none">
                  <CardHeader>
                    <CardTitle className="text-lg">No assessments assigned yet</CardTitle>
                    <CardDescription>
                      This campaign is linked to your account, but the assigned assessments are not available yet.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </div>
          )}

          {currentApplication.status === "Progressed" && (
            <Card className="relative overflow-hidden border-green-500/20 bg-green-500/5 shadow-none dark:bg-green-500/10">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                <CheckCircle2 className="h-32 w-32" />
              </div>
              <CardHeader>
                <CardTitle className="text-xl text-green-700 dark:text-green-300">Progressed</CardTitle>
                <CardDescription className="mt-1 flex items-center gap-2 text-base text-foreground/80">
                  Your completed application has moved to the next recruitment stage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground max-w-md relative z-10">
                  The Hiring Manager has reviewed this application. You do not need to complete anything else here.
                </p>
              </CardContent>
            </Card>
          )}

          {currentApplication.status === "Unsuccessful" && (
            <Card className="relative overflow-hidden border-red-500/20 bg-red-500/5 shadow-none dark:bg-red-500/10">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                <XCircle className="h-32 w-32" />
              </div>
              <CardHeader>
                <CardTitle className="text-xl text-red-700 dark:text-red-300">Unsuccessful</CardTitle>
                <CardDescription className="mt-1 flex items-center gap-2 text-base text-foreground/80">
                  This application has now concluded.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground max-w-md relative z-10">
                  Thank you for completing the assessment process. Any further updates will come from the Hiring Manager.
                </p>
              </CardContent>
            </Card>
          )}

          {currentApplication.status === "Completed" && (
            <Card className="relative overflow-hidden border-blue-500/20 bg-blue-500/5 shadow-none dark:bg-blue-500/10">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                <CheckCircle2 className="h-32 w-32" />
              </div>
              <CardHeader>
                <CardTitle className="text-xl text-blue-700 dark:text-blue-300">Assessment process complete</CardTitle>
                <CardDescription className="mt-1 flex items-center gap-2 text-base text-foreground/80">
                  Your responses have been submitted for review.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground max-w-md relative z-10">
                  You do not need to take further action unless the Hiring Manager contacts you.
                </p>
              </CardContent>
            </Card>
          )}

          {currentApplication.status === "Soft Locked" && (
            <Card className="relative overflow-hidden border-slate-500/20 bg-slate-500/5 shadow-none dark:bg-slate-500/10">
              <CardHeader>
                <CardTitle className="text-xl text-slate-700 dark:text-slate-300">Access currently unavailable</CardTitle>
                <CardDescription className="mt-1 flex items-center gap-2 text-base text-foreground/80">
                  This application is not currently available for action.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground max-w-md">
                  If you have been given a new Access Code, return to My Campaigns and enter it to reconnect where permitted.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {currentApplication.status !== "Awaiting Assessment" && currentApplication.status !== "In Progress" && (
          <div className="space-y-6">
            <Card className="border-border dark:border-white/5 bg-card dark:bg-[#080c16]/50 shadow-sm dark:shadow-none">
              <CardHeader>
                <CardTitle className="text-lg">Application details</CardTitle>
                <CardDescription>{currentApplication.code}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">{currentApplication.date}</p>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">{currentApplication.location}</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">Status: {currentApplication.status}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border dark:border-white/5 bg-card dark:bg-[#080c16]/50 shadow-sm dark:shadow-none">
              <CardHeader>
                <CardTitle className="text-lg">Need help?</CardTitle>
                <CardDescription>Contact the Hiring Manager if you have questions about this application.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full gap-2 border-border dark:border-white/5 bg-background dark:bg-[#04070d] hover:bg-muted dark:hover:bg-white/5" asChild>
                  <a href="mailto:hiring@ctrl.local?subject=CTRL%20Candidate%20Query">
                    <Mail className="h-4 w-4" /> Contact Hiring Manager
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
