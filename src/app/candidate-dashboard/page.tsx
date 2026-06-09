"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  KeyRound,
  Loader2,
  ChevronRight,
  Target,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Building2,
  Route,
  ArrowRight,
  ShieldCheck,
  Video
} from "lucide-react";
import {
  CandidateSessionService,
  type CandidatePortalApplication,
} from "@/services/candidate-session.service";

type CandidateApplicationStatus =
  | "Awaiting Assessment"
  | "In Progress"
  | "Completed"
  | "Progressed"
  | "Unsuccessful"
  | "Soft Locked";

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

function formatMode(value?: string | null) {
  switch (value) {
    case "remote": return "Remote";
    case "hybrid": return "Hybrid";
    case "in_person": return "In-person";
    default: return "Mode to be confirmed";
  }
}

function getApplicationKey(application: CandidatePortalApplication) {
  return application.documentId ?? application.candidateCode ?? "";
}

export default function CandidateDashboardOverviewPage() {
  const { user } = useAuth();
  const { userProfile } = useAuthStore();
  const [applications, setApplications] = useState<CandidatePortalApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const displayName =
    userProfile
      ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim() || userProfile.email || "Candidate"
      : user?.name || `${(user as any)?.firstName || ""} ${(user as any)?.lastName || ""}`.trim() || "Candidate";

  const loadApplications = useCallback(async (options?: { force?: boolean }) => {
    setIsLoading(true);
    try {
      const portalApplications = await CandidateSessionService.getMyApplications({ force: options?.force });
      setApplications(portalApplications);
    } catch (err) {
      console.error("Failed to load applications:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = accessCodeInput.trim();
    if (!code) {
      setError("Please enter an Access Code.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await CandidateSessionService.joinWithAccessCode(code);
      await loadApplications({ force: true });
      setSuccess("Successfully linked your assessments!");
      setAccessCodeInput("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid Access Code. Please check and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeApps = applications.filter((app) => {
    const status = mapPortalStatus(app);
    return status === "Awaiting Assessment" || status === "In Progress";
  });

  const completedApps = applications.filter((app) => {
    const status = mapPortalStatus(app);
    return status === "Completed" || status === "Progressed" || status === "Unsuccessful";
  });

  return (
    <div className="relative flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-3 duration-500 pb-12">
      {/* Decorative background glows */}
      <div className="absolute top-10 right-1/4 -z-10 h-80 w-80 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />
      
      {/* 1. HERO SECTION - JOIN A SESSION */}
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl dark:border-white/10 dark:bg-[#0b1329]/40 dark:backdrop-blur-md p-8 sm:p-12 lg:p-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent pointer-events-none" />
        
        {/* Subtle decorative circles */}
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[150%] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[100%] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">
          <div className="space-y-4">
            <Badge variant="outline" className="border-primary/30 bg-primary/15 text-primary px-3.5 py-1 text-xs font-semibold rounded-lg shadow-sm pointer-events-none">
              Welcome back, {displayName.split(" ")[0]}
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
              Ready to start your <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-400 to-blue-500">
                assessment journey?
              </span>
            </h1>
            <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
              Enter the Access Code provided by your Hiring Manager to instantly link a new assessment to your portal.
            </p>
          </div>

          <div className="w-full max-w-md pt-4">
            <form onSubmit={handlePair} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="e.g. CTRL-9A2X"
                  className="pl-12 h-14 rounded-xl text-lg font-mono uppercase tracking-widest bg-background border-border focus-visible:ring-primary shadow-inner dark:border-white/10 dark:bg-[#04070d]/50"
                  value={accessCodeInput}
                  onChange={(e) => setAccessCodeInput(e.target.value)}
                />
              </div>
              <Button type="submit" className="h-14 rounded-xl px-8 text-base font-semibold shadow-md transition-all hover:scale-[1.02]" disabled={isSubmitting || !accessCodeInput.trim()}>
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Join Assessment"}
              </Button>
            </form>
            {error && <p className="mt-3 text-sm text-red-400 font-medium animate-in slide-in-from-top-2">{error}</p>}
            {success && <p className="mt-3 text-sm text-green-400 font-medium animate-in slide-in-from-top-2">{success}</p>}
          </div>
        </div>
      </section>

      {/* 2. TASK-ORIENTED DISPLAY: NEEDS ATTENTION */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-primary" /> 
              Needs Attention
            </h2>
            <p className="text-sm text-slate-400">Assessments that are currently active or awaiting your input.</p>
          </div>
          {activeApps.length > 0 && (
             <Link href="/candidate-dashboard/my-assessments" className="text-sm font-semibold text-primary hover:underline hidden sm:flex items-center gap-1 transition-colors">
               View all <ArrowRight className="h-4 w-4" />
             </Link>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             {[1, 2, 3].map(i => (
                <Card key={i} className="border-border bg-card shadow-sm dark:border-white/5 dark:bg-[#0b1329]/40 opacity-50 animate-pulse">
                  <CardHeader className="h-24 bg-muted/50 rounded-t-xl" />
                  <CardContent className="h-32" />
                </Card>
             ))}
          </div>
        ) : activeApps.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeApps.map(app => {
              const completed = app.completion?.completed || 0;
              const total = Math.max(1, app.completion?.total || app.assessments?.length || 1);
              const percent = Math.round((completed / total) * 100);
              const applicationKey = getApplicationKey(app);
              const assessmentHref = applicationKey
                ? `/candidate-dashboard/my-assessments?session=${encodeURIComponent(applicationKey)}`
                : "/candidate-dashboard/my-assessments";

              return (
                <Card key={app.documentId || app.candidateCode} className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-lg dark:border-white/10 dark:bg-[#0b1329]/40 dark:backdrop-blur-md dark:shadow-2xl">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-primary to-blue-500" />
                  <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-primary/5 blur-xl pointer-events-none" />
                  
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-xl font-bold line-clamp-1">{app.campaign?.name || "Assessment"}</CardTitle>
                          <CardDescription className="text-sm mt-1 text-slate-400 truncate">{app.campaign?.jobRole || "Role"}</CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap shrink-0 px-2.5 py-0.5 font-semibold rounded-lg pointer-events-none">
                           {mapPortalStatus(app)}
                        </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                           <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                           <span className="truncate">{formatDate(app.sessionStartsAt || app.campaign?.endDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                           <Target className="h-4 w-4 shrink-0 text-primary" />
                           <span className="truncate">{formatMode(app.mode)}</span>
                        </div>
                    </div>

                    {app.expiresAt && (
                      <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/15 bg-amber-500/5 px-3 py-2 text-xs text-amber-500 dark:text-amber-400">
                        <Clock3 className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-medium">Session expires: {formatDate(app.expiresAt)}</span>
                      </div>
                    )}
                    
                    <div className="space-y-2 bg-muted/30 p-3.5 rounded-xl dark:bg-white/[0.02] shadow-inner border border-white/5">
                        <div className="flex justify-between text-xs font-semibold text-slate-400">
                           <span>Progress</span>
                           <span>{completed} / {total} Completed</span>
                        </div>
                        <Progress value={percent} className="h-1.5 bg-muted dark:bg-white/10" />
                    </div>

                    {app.assessments && app.assessments.length > 0 && (
                      <div className="space-y-2 pt-1 border-t border-border/50 dark:border-white/5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assessments Included</p>
                        <div className="flex flex-wrap gap-1.5">
                          {app.assessments.slice(0, 3).map((ass) => (
                            <Badge key={ass.name || ass.slug} variant="outline" className="text-xs font-normal border-slate-200 bg-slate-50 dark:border-white/5 dark:bg-white/[0.02] text-slate-500 dark:text-slate-300 rounded-md px-2 py-0.5">
                              {ass.name || ass.slug}
                            </Badge>
                          ))}
                          {app.assessments.length > 3 && (
                            <Badge variant="outline" className="text-xs font-normal border-slate-200 bg-slate-50 dark:border-white/5 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 rounded-md px-2 py-0.5">
                              +{app.assessments.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <Button className="group w-full gap-2 font-semibold shadow-md" asChild>
                      <Link href={assessmentHref}>
                        Continue Assessment <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-[2rem] border border-dashed border-border dark:border-white/10 bg-gradient-to-b from-white/[0.01] to-transparent p-12 text-center">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary mb-6 shadow-inner">
              <CheckCircle2 className="h-7 w-7 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">You're all caught up!</h3>
            <p className="max-w-sm mx-auto text-sm text-slate-400 leading-relaxed">
              You don't have any active assessments right now. Enter your access code in the welcome hero above to link your session and begin.
            </p>
          </div>
        )}
      </section>

      {/* 3. HOW IT WORKS - REDESIGNED */}
      <section className="space-y-8">
        {/* Section Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-foreground">How It Works</h2>
            <p className="text-sm text-slate-400">Your step-by-step guide to completing the assessment process.</p>
          </div>
          <Badge variant="outline" className="w-fit border-primary/20 bg-primary/15 px-3.5 py-1 text-primary font-semibold rounded-lg shadow-sm pointer-events-none">
            <Route className="mr-1.5 h-3.5 w-3.5" />
            Candidate Journey
          </Badge>
        </div>

        {/* Steps — vertical timeline on mobile, horizontal on lg+ */}
        <div className="relative">


          <div className="grid gap-6 lg:grid-cols-3 relative z-10">

            {/* STEP 1 */}
            <div className="flex flex-col gap-5">
              {/* Icon + step badge */}
              <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-3">
                <div className="relative shrink-0">
                  <div className="h-[3.5rem] w-[3.5rem] rounded-2xl border border-primary/30 bg-primary/10 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                    <KeyRound className="h-6 w-6 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shadow-md">1</span>
                </div>
                <div className="lg:hidden">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Step 01</p>
                  <h3 className="text-lg font-bold text-foreground">Join Assessment Session</h3>
                </div>
              </div>
              {/* Card */}
              <div className="flex-1 rounded-2xl border border-border bg-card dark:bg-[#0b1329]/30 dark:border-white/10 dark:backdrop-blur-md p-6 space-y-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/20 dark:hover:border-primary/20 group">
                <div className="hidden lg:block">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Step 01</p>
                  <h3 className="text-lg font-bold text-foreground">Join Assessment Session</h3>
                </div>
                <p className="text-sm leading-relaxed text-slate-400">
                  Enter the <span className="text-foreground font-semibold">Access Code</span> provided by your Hiring Manager. We'll instantly link the correct assessment session, date, mode, and task list to your portal.
                </p>
                {/* Visual accent */}
                <div className="rounded-xl border border-border dark:border-white/5 bg-muted/30 dark:bg-white/[0.02] px-4 py-3 flex items-center gap-3">
                  <div className="font-mono text-base tracking-[0.25em] font-bold text-foreground bg-background dark:bg-[#04070d]/60 border border-border dark:border-white/10 px-3 py-1.5 rounded-lg text-sm">CTRL–9A2X</div>
                  <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs text-slate-400 font-medium">Session linked</span>
                </div>
              </div>
            </div>

            {/* STEP 2 */}
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-3">
                <div className="relative shrink-0">
                  <div className="h-[3.5rem] w-[3.5rem] rounded-2xl border border-blue-500/30 bg-blue-500/10 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.12)]">
                    <ShieldCheck className="h-6 w-6 text-blue-400" />
                  </div>
                  <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center shadow-md">2</span>
                </div>
                <div className="lg:hidden">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Step 02</p>
                  <h3 className="text-lg font-bold text-foreground">Prepare for Your Mode</h3>
                </div>
              </div>
              <div className="flex-1 rounded-2xl border border-border bg-card dark:bg-[#0b1329]/30 dark:border-white/10 dark:backdrop-blur-md p-6 space-y-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-400/20 dark:hover:border-blue-400/20 group">
                <div className="hidden lg:block">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">Step 02</p>
                  <h3 className="text-lg font-bold text-foreground">Prepare for Your Mode</h3>
                </div>
                <p className="text-sm leading-relaxed text-slate-400">
                  All assessment sessions follow the <span className="text-foreground font-semibold">same assessment standards</span> — but setup requirements differ based on delivery mode.
                </p>
                {/* Mode sub-cards */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-border dark:border-white/5 bg-muted/30 dark:bg-[#04070d]/50 p-3.5 space-y-1.5 hover:border-primary/20 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <Video className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-xs font-bold text-foreground">Remote</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-400">Quiet space, stable internet, laptop or desktop required.</p>
                  </div>
                  <div className="rounded-xl border border-border dark:border-white/5 bg-muted/30 dark:bg-[#04070d]/50 p-3.5 space-y-1.5 hover:border-primary/20 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-xs font-bold text-foreground">In-person</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-400">Attend the venue or supervised session from the hiring team.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 3 */}
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-3">
                <div className="relative shrink-0">
                  <div className="h-[3.5rem] w-[3.5rem] rounded-2xl border border-green-500/30 bg-green-500/10 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.12)]">
                    <CheckCircle2 className="h-6 w-6 text-green-400" />
                  </div>
                  <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-green-500 text-white text-[10px] font-black flex items-center justify-center shadow-md">3</span>
                </div>
                <div className="lg:hidden">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-green-400">Step 03</p>
                  <h3 className="text-lg font-bold text-foreground">Submit & Await Outcome</h3>
                </div>
              </div>
              <div className="flex-1 rounded-2xl border border-border bg-card dark:bg-[#0b1329]/30 dark:border-white/10 dark:backdrop-blur-md p-6 space-y-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-green-400/20 dark:hover:border-green-400/20 group">
                <div className="hidden lg:block">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-green-400 mb-1">Step 03</p>
                  <h3 className="text-lg font-bold text-foreground">Submit & Await Outcome</h3>
                </div>
                <p className="text-sm leading-relaxed text-slate-400">
                  Once all assigned assessments are complete, your responses are <span className="text-foreground font-semibold">securely submitted</span> for the hiring team to review.
                </p>
                {/* Visual confirmation state */}
                <div className="rounded-xl border border-green-500/15 bg-green-500/5 px-4 py-3 flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-green-400">All responses submitted</p>
                    <p className="text-[11px] text-slate-400">No further action required from you</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. COMPLETED ASSESSMENTS (Collapsible/Secondary) */}
      {completedApps.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-border dark:border-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" /> Past Assessments
            </h3>
            <span className="text-xs text-slate-400">{completedApps.length} session{completedApps.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
             {completedApps.map(app => {
                const applicationKey = getApplicationKey(app);
                const assessmentHref = applicationKey
                  ? `/candidate-dashboard/my-assessments?session=${encodeURIComponent(applicationKey)}`
                  : "/candidate-dashboard/my-assessments";

                return (
                <Link key={app.documentId || app.candidateCode} href={assessmentHref} className="block group">
                  <Card className="h-full rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:border-slate-400 dark:border-white/10 dark:bg-[#0b1329]/20 dark:backdrop-blur-sm hover:dark:border-white/30">
                    <CardHeader className="p-4 space-y-2">
                       <CardTitle className="text-base font-bold line-clamp-1 group-hover:text-primary transition-colors">{app.campaign?.name || "Assessment"}</CardTitle>
                       <CardDescription className="text-xs text-slate-400 line-clamp-1">{app.campaign?.jobRole || "Role"}</CardDescription>
                       <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-md text-slate-400 border-border dark:border-white/5">{mapPortalStatus(app)}</Badge>
                    </CardHeader>
                  </Card>
                </Link>
                );
             })}
          </div>
        </section>
      )}

    </div>
  );
}
