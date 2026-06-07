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
      setSuccess("Successfully joined the campaign!");
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
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-3 duration-500 pb-12">
      
      {/* 1. HERO SECTION - JOIN A SESSION */}
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card shadow-lg dark:border-white/10 p-8 sm:p-12 lg:p-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent pointer-events-none" />
        
        {/* Subtle decorative circles */}
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[150%] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[100%] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">
          <div className="space-y-3">
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary px-3 py-1 text-xs">
              Welcome back, {displayName.split(" ")[0]}
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
              Ready to start your <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">
                assessment journey?
              </span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Enter the Access Code provided by your Hiring Manager to instantly link a new assessment to your portal.
            </p>
          </div>

          <div className="w-full max-w-md pt-4">
            <form onSubmit={handlePair} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="e.g. CTRL-9A2X"
                  className="pl-12 h-14 rounded-xl text-lg font-mono uppercase tracking-wider bg-background border-border focus-visible:ring-primary shadow-sm"
                  value={accessCodeInput}
                  onChange={(e) => setAccessCodeInput(e.target.value)}
                />
              </div>
              <Button type="submit" className="h-14 rounded-xl px-8 text-base font-medium shadow-sm transition-all hover:scale-[1.02]" disabled={isSubmitting || !accessCodeInput.trim()}>
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Join Assessment"}
              </Button>
            </form>
            {error && <p className="mt-3 text-sm text-red-500 font-medium animate-in slide-in-from-top-2">{error}</p>}
            {success && <p className="mt-3 text-sm text-green-600 dark:text-green-400 font-medium animate-in slide-in-from-top-2">{success}</p>}
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
            <p className="text-sm text-muted-foreground">Campaigns that are currently active or awaiting your input.</p>
          </div>
          {activeApps.length > 0 && (
             <Link href="/candidate-dashboard/my-campaigns" className="text-sm font-medium text-primary hover:underline hidden sm:flex items-center gap-1">
               View all <ArrowRight className="h-4 w-4" />
             </Link>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             {[1, 2, 3].map(i => (
                <Card key={i} className="border-border bg-card shadow-sm dark:bg-[#080c16]/50 opacity-50 animate-pulse">
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
              const campaignHref = applicationKey
                ? `/candidate-dashboard/my-campaigns?session=${encodeURIComponent(applicationKey)}`
                : "/candidate-dashboard/my-campaigns";

              return (
                <Card key={app.documentId || app.candidateCode} className="group relative overflow-hidden border-border bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-md dark:border-white/5 dark:bg-[#080c16]/70">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                       <div>
                         <CardTitle className="text-xl line-clamp-1">{app.campaign?.name || "Campaign"}</CardTitle>
                         <CardDescription className="text-sm mt-1">{app.campaign?.jobRole || "Role"}</CardDescription>
                       </div>
                       <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 whitespace-nowrap shrink-0">
                          {mapPortalStatus(app)}
                       </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <CalendarDays className="h-4 w-4 shrink-0 text-primary/70" />
                         <span className="truncate">{formatDate(app.sessionStartsAt || app.campaign?.endDate)}</span>
                       </div>
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <Target className="h-4 w-4 shrink-0 text-primary/70" />
                         <span className="truncate">{formatMode(app.mode)}</span>
                       </div>
                    </div>
                    
                    <div className="space-y-2 bg-muted/30 p-3 rounded-lg dark:bg-white/[0.02]">
                       <div className="flex justify-between text-xs font-medium">
                          <span>Progress</span>
                          <span>{completed} / {total} Completed</span>
                       </div>
                       <Progress value={percent} className="h-1.5" />
                    </div>

                    <Button className="w-full gap-2 group-hover:bg-primary/90" asChild>
                      <Link href={campaignHref}>
                        Continue Assessment <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="border-dashed border-border bg-transparent shadow-none dark:border-white/10">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="rounded-full bg-muted p-4 mb-4 dark:bg-white/5">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium text-foreground">You're all caught up!</p>
              <p className="max-w-md mx-auto mt-2">You don't have any active campaigns right now. Enter an Access Code above to join a new one.</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* 3. INTEGRATED NEXT STEPS TIMELINE */}
      <section className="space-y-6">
         <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
               <h2 className="text-2xl font-bold text-foreground">How It Works</h2>
               <p className="text-sm text-muted-foreground">Your campaign card will show whether your session is remote, in-person, or hybrid.</p>
            </div>
            <Badge variant="outline" className="w-fit border-primary/30 bg-primary/10 px-3 py-1 text-primary">
              <Route className="mr-1.5 h-3.5 w-3.5" />
              Candidate journey
            </Badge>
         </div>
         
         <div className="grid gap-4 xl:grid-cols-[1fr_1.45fr_1fr]">
            {[
              {
                step: "01",
                title: "Join the Campaign",
                body: "Enter your Access Code and we'll attach the correct campaign, date, mode, and assessment list to your portal.",
                icon: KeyRound,
                tone: "bg-primary/10 text-primary border-primary/20",
              },
              {
                step: "02",
                title: "Prepare for Your Mode",
                body: "Remote and in-person campaigns follow the same assessment standards, but the setup is different.",
                icon: ShieldCheck,
                tone: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
                modes: true,
              },
              {
                step: "03",
                title: "Submit and Wait",
                body: "Once your assigned assessments are complete, your responses are securely sent for hiring-team review.",
                icon: Clock3,
                tone: "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400",
              },
            ].map((step) => (
               <Card key={step.step} className="relative overflow-hidden border-border bg-card shadow-sm dark:border-white/5 dark:bg-[#080c16]/60">
                  <CardContent className="flex h-full flex-col gap-5 p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${step.tone}`}>
                        <step.icon className="h-5 w-5" />
                      </div>
                      <Badge variant="secondary" className="bg-muted text-muted-foreground dark:bg-white/5">
                        Step {step.step}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold tracking-tight text-foreground">{step.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                    </div>

                    {step.modes && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-border bg-muted/30 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Video className="h-4 w-4 text-primary" />
                            Remote
                          </div>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            Use a quiet space, stable internet, and a laptop or desktop. You will launch the secure assessment window from this portal.
                          </p>
                        </div>
                        <div className="rounded-xl border border-border bg-muted/30 p-4 dark:border-white/5 dark:bg-white/[0.02]">
                          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Building2 className="h-4 w-4 text-primary" />
                            In-person
                          </div>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            Attend the venue or supervised session shared by the hiring team. Your portal still tracks progress and submitted tasks.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
               </Card>
            ))}
         </div>
      </section>

      {/* 4. COMPLETED CAMPAIGNS (Collapsible/Secondary) */}
      {completedApps.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-border dark:border-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" /> Past Campaigns
            </h3>
            <span className="text-sm text-muted-foreground">{completedApps.length} session{completedApps.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
             {completedApps.map(app => {
                const applicationKey = getApplicationKey(app);
                const campaignHref = applicationKey
                  ? `/candidate-dashboard/my-campaigns?session=${encodeURIComponent(applicationKey)}`
                  : "/candidate-dashboard/my-campaigns";

                return (
                <Link key={app.documentId || app.candidateCode} href={campaignHref} className="block group">
                  <Card className="h-full border-border bg-card shadow-sm transition-all hover:border-primary/30 dark:border-white/5 dark:bg-[#080c16]/30 dark:hover:bg-[#080c16]/60">
                    <CardHeader className="p-4">
                       <CardTitle className="text-base line-clamp-1">{app.campaign?.name || "Campaign"}</CardTitle>
                       <CardDescription className="text-xs mt-0.5 line-clamp-1">{app.campaign?.jobRole || "Role"}</CardDescription>
                       <Badge variant="outline" className="mt-2 text-xs w-fit bg-background">{mapPortalStatus(app)}</Badge>
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
