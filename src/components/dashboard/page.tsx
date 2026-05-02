"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Inbox, ChevronRight, X, BarChart, Send, XCircle, CalendarDays } from "lucide-react";

type CandidateType = {
  id: number; name: string; session: string; status: string; match: string;
  scores: { typing: string; call: string; sjt: string };
  notes: string;
};

export default function CandidateReviewPage() {
  // --- State Management ---
  const [selectedReviewCandidate, setSelectedReviewCandidate] = useState<CandidateType | null>(null);
  const [reviewQueue, setReviewQueue] = useState<CandidateType[]>([
    { 
      id: 101, name: "Sarah Jenkins", session: "09:00 AM", status: "Ready for review", match: "High",
      scores: { typing: "95 WPM", call: "92%", sjt: "18/20" },
      notes: "Excellent communication skills. Remained extremely calm during the call simulation."
    },
    { 
      id: 102, name: "Michael Chang", session: "09:00 AM", status: "Ready for review", match: "Medium",
      scores: { typing: "65 WPM", call: "78%", sjt: "14/20" },
      notes: "Good technical skills, but showed some hesitation in prioritization scenarios."
    },
    { 
      id: 103, name: "Emma Rodriguez", session: "01:00 PM", status: "Ready for review", match: "High",
      scores: { typing: "88 WPM", call: "85%", sjt: "19/20" },
      notes: "Strong all-around performance. Excellent decision-making logic."
    }
  ]);

  // --- Action Handlers ---
  const handleAction = (id: number) => {
    setReviewQueue(reviewQueue.filter(c => c.id !== id));
    setSelectedReviewCandidate(null);
  };

  return (
    <div className="space-y-6 max-w-4xl relative">
      {/* Candidate Review Modal Overlay */}
      {selectedReviewCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl bg-card shadow-2xl border-border dark:border-white/10 animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-start justify-between pb-4 border-b border-border/50">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-2xl">{selectedReviewCandidate.name}</CardTitle>
                  <Badge variant={selectedReviewCandidate.match === "High" ? "default" : "secondary"}>
                    {selectedReviewCandidate.match} Match
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5" /> Session: {selectedReviewCandidate.session}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="-mr-2 -mt-2" onClick={() => setSelectedReviewCandidate(null)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div>
                {/* Candidate Scores & Summary */}
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <BarChart className="h-4 w-4 text-primary" /> Assessment Scores
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border border-border dark:border-white/5 bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Typing Test</p>
                    <p className="font-semibold text-lg">{selectedReviewCandidate.scores.typing}</p>
                  </div>
                  <div className="rounded-lg border border-border dark:border-white/5 bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Call Simulation</p>
                    <p className="font-semibold text-lg">{selectedReviewCandidate.scores.call}</p>
                  </div>
                  <div className="rounded-lg border border-border dark:border-white/5 bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Situational Judgement</p>
                    <p className="font-semibold text-lg">{selectedReviewCandidate.scores.sjt}</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Inbox className="h-4 w-4 text-primary" /> AI Hybrid Summary
                </h4>
                <div className="rounded-lg border border-border dark:border-white/5 bg-muted/10 p-4 text-sm leading-relaxed text-muted-foreground">
                  {selectedReviewCandidate.notes}
                </div>
              </div>
            </CardContent>
            {/* Modal Actions */}
            <CardFooter className="flex justify-between border-t border-border/50 pt-4">
              <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50" onClick={() => handleAction(selectedReviewCandidate.id)}>
                <XCircle className="h-4 w-4 mr-2" /> Decline
              </Button>
              <Button onClick={() => handleAction(selectedReviewCandidate.id)}>
                Progress to Client <Send className="h-4 w-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Review Queue List */}
      <Card className="border-border dark:border-white/5 bg-card dark:bg-[#080c16]/50 shadow-sm dark:shadow-none h-fit">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Candidate Review Queue</CardTitle>
          </div>
          <CardDescription>Evaluate completed session assessments.</CardDescription>
        </CardHeader>
        <CardContent>
          {reviewQueue.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-border dark:border-white/5 bg-muted/50 dark:bg-[#04070d]/50 text-center p-4">
              <Inbox className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium text-foreground">Queue empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviewQueue.map(candidate => (
                <div key={candidate.id} className="flex items-center justify-between rounded-xl border border-border dark:border-white/5 bg-muted/20 dark:bg-white/[0.01] p-3 transition-colors hover:bg-muted/50 dark:hover:bg-white/[0.03]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {candidate.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{candidate.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{candidate.session}</span>
                        <span className="h-1 w-1 rounded-full bg-border dark:bg-white/10"></span>
                        <span className="text-xs font-medium text-green-600 dark:text-green-500">{candidate.status}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" className="gap-1 h-8 rounded-lg px-3" onClick={() => setSelectedReviewCandidate(candidate)}>
                    Review <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
