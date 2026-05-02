"use client";

import { useState } from "react";
import { AssessmentCard } from "@/components/dashboard/assessment-card";
import { candidateAssessmentItems } from "@/components/dashboard/candidate-dashboard-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, Lock, Unlock } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";

/**
 * MyAssessmentsPage
 * 
 * Allows candidates to unlock their assigned session and view their assessments.
 */
export default function MyAssessmentsPage() {
  const [sessionCode, setSessionCode] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState("");

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate that the code starts with CTRL- (matches HM dashboard generator)
    if (sessionCode.toUpperCase().startsWith("CTRL-")) {
      setIsUnlocked(true);
      setError("");
    } else {
      setError("Invalid session code. Please check with your hiring manager.");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <DashboardPageHeader 
        title="My Assessments" 
        description="Access your assigned assessments for this session." 
      />

      {!isUnlocked ? (
        <Card className="max-w-md border-border dark:border-white/5 bg-card dark:bg-[#080c16]/50 shadow-sm dark:shadow-none">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
              <Lock className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl">Enter Session Code</CardTitle>
            <CardDescription>Your hiring manager will provide a unique code for your assessment session.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="e.g. CTRL-9A2X"
                    value={sessionCode}
                    onChange={(e) => setSessionCode(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring uppercase"
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>
              <Button type="submit" className="w-full h-11" disabled={!sessionCode}>
                Unlock Assessments
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-500 bg-green-500/10 px-4 py-2 rounded-lg w-fit border border-green-500/20">
            <Unlock className="h-4 w-4" />
            <span className="text-sm font-medium">Session {sessionCode.toUpperCase()} Unlocked</span>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {candidateAssessmentItems.map((item) => (
              <AssessmentCard key={item.title} title={item.title} description={item.description} icon={<item.icon className="h-6 w-6" />} href={item.href} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}