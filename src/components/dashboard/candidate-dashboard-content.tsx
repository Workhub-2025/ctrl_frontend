"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Clock, KeyRound, Lock, Mail, MapPin, CheckCircle2, Unlock, Settings2, ChevronRight, ArrowLeft, Briefcase, Plus, XCircle } from "lucide-react";
import { AssessmentCard } from "@/components/dashboard/assessment-card";
import {
  candidateAssessmentItems,
  completionLabels,
} from "@/components/dashboard/candidate-dashboard-data";

type CandidateSession = {
  code: string;
  role: string;
  date: string;
  status: "Awaiting Assessment" | "Progressed" | "Unsuccessful" | "Completed";
  location: string;
  isUnlocked: boolean;
};

export function CandidateDashboardContent({
  completedKey,
}: {
  completedKey?: string;
}) {
  const completedAssessment = completedKey
    ? completionLabels[completedKey]
    : null;

  const [selectedSessionCode, setSelectedSessionCode] = useState<string | null>(null);
  const [isPairingNew, setIsPairingNew] = useState(false);
  const [newSessionCode, setNewSessionCode] = useState("");
  const [sessions, setSessions] = useState<CandidateSession[]>([
    { code: "CTRL-TEST", role: "Emergency Call Handler", date: "Oct 24, 2023", status: "Awaiting Assessment", location: "Metro Control Room (In-person)", isUnlocked: false },
    { code: "CTRL-PAST1", role: "Dispatch Operator", date: "Sep 12, 2023", status: "Progressed", location: "Remote", isUnlocked: true },
    { code: "CTRL-PAST2", role: "Trainee Supervisor", date: "Aug 05, 2023", status: "Unsuccessful", location: "Metro Control Room (In-person)", isUnlocked: true },
  ]);
  const [error, setError] = useState("");

  const handlePair = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newSessionCode.toUpperCase();
    // Validate that the code starts with CTRL- (matches HM dashboard generator)
    if (code.startsWith("CTRL-")) {
      if (!sessions.find(s => s.code === code)) {
        setSessions([{
          code,
          role: "New Application",
          date: "TBD",
          status: "Awaiting Assessment",
          location: "TBD",
          isUnlocked: false
        }, ...sessions]);
      }
      setSelectedSessionCode(code);
      setIsPairingNew(false);
      setNewSessionCode("");
      setError("");
    } else {
      setError("Invalid session code. Please check your invitation email.");
    }
  };

  const toggleSessionLock = () => {
    setSessions(sessions.map(s => 
      s.code === selectedSessionCode ? { ...s, isUnlocked: !s.isUnlocked } : s
    ));
  };

  const currentSession = sessions.find(s => s.code === selectedSessionCode);

  if (!selectedSessionCode || !currentSession) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold font-headline text-foreground">My Applications</h1>
              <p className="text-muted-foreground">Track your progress and access upcoming assessment sessions.</p>
            </div>
            <Button onClick={() => setIsPairingNew(!isPairingNew)} className="gap-2">
              <Plus className="h-4 w-4" /> Pair New Session
            </Button>
          </div>
        </section>

        {isPairingNew && (
          <Card className="w-full bg-card dark:bg-[#080c16]/80 border-border dark:border-white/5 shadow-sm animate-in slide-in-from-top-4 duration-300">
            <CardContent className="pt-6">
              <form onSubmit={handlePair} className="flex flex-col sm:flex-row items-end gap-4">
                <div className="space-y-2 w-full flex-1">
                  <Label htmlFor="code">Enter Session Code</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="code"
                      value={newSessionCode}
                      onChange={(e) => setNewSessionCode(e.target.value.toUpperCase())}
                      placeholder="e.g. CTRL-9A2X"
                      className="h-11 uppercase font-mono tracking-wider pl-10"
                    />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                </div>
                <Button type="submit" className="w-full sm:w-auto h-11" disabled={!newSessionCode}>
                  Join Session
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <Card 
              key={session.code} 
              className="cursor-pointer border-border dark:border-white/5 bg-card hover:bg-muted/50 transition-all hover:-translate-y-1 shadow-sm flex flex-col"
              onClick={() => setSelectedSessionCode(session.code)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`
                      ${session.status === 'Progressed' ? 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400' : ''}
                      ${session.status === 'Unsuccessful' ? 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400' : ''}
                      ${session.status === 'Awaiting Assessment' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400' : ''}
                    `}
                  >
                    {session.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{session.role}</CardTitle>
                <CardDescription className="font-mono text-xs mt-1">{session.code}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground flex-grow space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> {session.date}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {session.location}
                </div>
              </CardContent>
              <div className="px-6 py-4 border-t border-border dark:border-white/5 flex items-center justify-between text-sm font-medium text-primary mt-auto">
                {session.status === 'Awaiting Assessment' ? 'Access Assessment Day' : 'View Details'}
                <ChevronRight className="h-4 w-4" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      {/* Top Section */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
            Session Paired: {currentSession.code}
          </Badge>
          <Badge 
            variant="outline" 
            className="border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 cursor-pointer hover:bg-amber-500/20 transition-colors"
            onClick={toggleSessionLock}
          >
            <Settings2 className="w-3 h-3 mr-1" />
            Dev Toggle: {currentSession.isUnlocked ? "Lock" : "Unlock"} Session
          </Badge>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold font-headline leading-tight text-foreground">
            {currentSession.role}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            {currentSession.status === 'Awaiting Assessment' 
              ? "Your account is securely linked to your upcoming session. Review the preparation steps below before you arrive."
              : "This session has concluded. You can review your completion status below."}
          </p>
        </div>
      </section>

      {completedAssessment && (
        <Alert className="rounded-2xl border-primary/30 bg-primary/5">
          <AlertTitle>{completedAssessment} submitted</AlertTitle>
          <AlertDescription>
            Your assessment has been received. You can continue with the
            remaining sections whenever you are ready.
          </AlertDescription>
        </Alert>
      )}

      <div className={`grid gap-6 ${!currentSession.isUnlocked ? "lg:grid-cols-[1.5fr_1fr]" : ""}`}>
        <div className="space-y-6">
          {/* Countdown Card */}
          {!currentSession.isUnlocked && (
            <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10 overflow-hidden relative shadow-none">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                <Clock className="h-32 w-32" />
              </div>
              <CardHeader>
                <CardTitle className="text-xl text-primary">Scheduled for {currentSession.date}</CardTitle>
                <CardDescription className="text-base text-foreground/80 flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-primary/70" /> {currentSession.location}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 my-4">
                  <div className="flex flex-col p-4 bg-background dark:bg-[#04070d] rounded-xl border border-border dark:border-white/5 min-w-[80px] items-center justify-center shadow-sm">
                    <span className="text-3xl font-bold font-mono">02</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Days</span>
                  </div>
                  <div className="flex flex-col p-4 bg-background dark:bg-[#04070d] rounded-xl border border-border dark:border-white/5 min-w-[80px] items-center justify-center shadow-sm">
                    <span className="text-3xl font-bold font-mono">14</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Hours</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground max-w-md relative z-10">
                  Your assessments are currently locked. The hiring manager will authorize and unlock your session upon arrival at the testing facility.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Unlocked Assessments */}
          {currentSession.isUnlocked && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <Alert className="border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400">
                <Unlock className="h-5 w-5 !text-green-700 dark:!text-green-400" />
                <AlertTitle className="text-green-800 dark:text-green-300">Session Authorized</AlertTitle>
                <AlertDescription className="text-green-700/80 dark:text-green-400/80">
                  Your hiring manager has unlocked your session. You may now begin your assessments.
                </AlertDescription>
              </Alert>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {candidateAssessmentItems.map((item) => (
                  <AssessmentCard
                    key={item.title}
                    title={item.title}
                    description={item.description}
                    icon={<item.icon className="h-6 w-6" />}
                    href={item.href}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {!currentSession.isUnlocked && (
          <div className="space-y-6">
            {/* Prep Card */}
            <Card className="border-border dark:border-white/5 bg-card dark:bg-[#080c16]/50 shadow-sm dark:shadow-none">
              <CardHeader>
                <CardTitle className="text-lg">Before your day</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">Bring a valid government-issued photo ID.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">Arrive 15 minutes before your scheduled start time.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">Get a good night's sleep. Assessments measure reflexes and decision making.</p>
                </div>
              </CardContent>
            </Card>

            {/* Reschedule Card */}
            <Card className="border-border dark:border-white/5 bg-card dark:bg-[#080c16]/50 shadow-sm dark:shadow-none">
              <CardHeader>
                <CardTitle className="text-lg">Need to reschedule?</CardTitle>
                <CardDescription>If you cannot make your assigned session, let us know immediately.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full gap-2 border-border dark:border-white/5 bg-background dark:bg-[#04070d] hover:bg-muted dark:hover:bg-white/5">
                  <Mail className="h-4 w-4" /> Contact Hiring Manager
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
