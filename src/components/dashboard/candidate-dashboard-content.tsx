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
import { ArrowLeft, Briefcase, CheckCircle2, ChevronRight, Clock, KeyRound, Mail, MapPin, Plus, XCircle } from "lucide-react";
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
    { code: "CTRL-TEST", role: "Emergency Call Handler", date: "Oct 24, 2023", status: "Awaiting Assessment", location: "Metro Control Room (In-person)" },
    { code: "CTRL-PAST1", role: "Dispatch Operator", date: "Sep 12, 2023", status: "Progressed", location: "Remote" },
    { code: "CTRL-PAST2", role: "Trainee Supervisor", date: "Aug 05, 2023", status: "Unsuccessful", location: "Metro Control Room (In-person)" },
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="gap-2 px-0 text-muted-foreground hover:text-foreground"
            onClick={() => setSelectedSessionCode(null)}
          >
            <ArrowLeft className="h-4 w-4" />
            Return to My Applications
          </Button>
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
            Session Paired: {currentSession.code}
          </Badge>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold font-headline leading-tight text-foreground">
            {currentSession.role}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            {currentSession.status === 'Awaiting Assessment' 
              ? "Your account is linked to your assessment session. Begin each assessment when you are ready."
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

      <div className={`grid gap-6 ${currentSession.status !== "Awaiting Assessment" ? "lg:grid-cols-[1.5fr_1fr]" : ""}`}>
        <div className="space-y-6">
          {currentSession.status === "Awaiting Assessment" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <Alert className="border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400">
                <CheckCircle2 className="h-5 w-5 !text-blue-700 dark:!text-blue-400" />
                <AlertTitle className="text-blue-800 dark:text-blue-300">Awaiting Assessment</AlertTitle>
                <AlertDescription className="text-blue-700/80 dark:text-blue-400/80">
                  Your assessment session is available. Start with the typing test while the visual shells are being refined.
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

          {currentSession.status === "Progressed" && (
            <Card className="relative overflow-hidden border-green-500/20 bg-green-500/5 shadow-none dark:bg-green-500/10">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                <CheckCircle2 className="h-32 w-32" />
              </div>
              <CardHeader>
                <CardTitle className="text-xl text-green-700 dark:text-green-300">Progressed</CardTitle>
                <CardDescription className="mt-1 flex items-center gap-2 text-base text-foreground/80">
                  Your completed session has moved to the next recruitment stage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground max-w-md relative z-10">
                  The hiring team has reviewed this application. You do not need to complete anything else here.
                </p>
              </CardContent>
            </Card>
          )}

          {currentSession.status === "Unsuccessful" && (
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
                  Thank you for completing the assessment process. Any further updates will come from the hiring team.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {currentSession.status !== "Awaiting Assessment" && (
          <div className="space-y-6">
            <Card className="border-border dark:border-white/5 bg-card dark:bg-[#080c16]/50 shadow-sm dark:shadow-none">
              <CardHeader>
                <CardTitle className="text-lg">Session details</CardTitle>
                <CardDescription>{currentSession.code}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">{currentSession.date}</p>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">{currentSession.location}</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">Status: {currentSession.status}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border dark:border-white/5 bg-card dark:bg-[#080c16]/50 shadow-sm dark:shadow-none">
              <CardHeader>
                <CardTitle className="text-lg">Need help?</CardTitle>
                <CardDescription>Contact the hiring team if you have questions about this application.</CardDescription>
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
