"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ThumbsDown,
  ThumbsUp,
  Keyboard,
  ClipboardList,
  BrainCircuit,
  PhoneCall,
  FileQuestion,
  ShieldCheck,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  User,
  Phone
} from "lucide-react";
import {
  HiringManagerPortalClientService,
  type HiringManagerAssessmentResult,
  type HiringManagerCampaignDetail,
} from "@/services/hiring-manager-portal-client.service";
import {
  portalAlertErrorClass,
  portalAlertInfoClass,
  portalHeroPanelClass,
  portalMutedBubbleClass,
  portalCodeSurfaceClass,
  portalScoreMeterClass,
  portalSuccessButtonClass,
  portalPanelClass,
  portalPanelElevatedClass,
  portalPanelNestedClass,
  portalProgressBarClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";

type CandidateReportProps = {
  candidateId: string;
  campaignId?: string;
  candidateSessionId?: string;
  embedded?: boolean;
};

type CandidateReportData = {
  candidate: HiringManagerCampaignDetail["joinedCandidates"][number];
  campaign: HiringManagerCampaignDetail;
};

type AssessmentReportRow = {
  name: string;
  weight: number;
  result: HiringManagerAssessmentResult | null;
  score: number | null;
  contribution: number;
};

type TypingRunMetric = {
  runIndex?: number;
  wpm?: number;
  accuracy?: number;
  mistakeCharacters?: number;
  correctCharacters?: number;
  typedCharacters?: number;
  duration?: number;
};

type CallSimulationRun = {
  runIndex: number;
  form?: Record<string, unknown>;
  metrics?: Record<string, any>;
};

function buildEqualWeights(assessmentStack: string[]) {
  if (assessmentStack.length === 0) return {};
  const baseWeight = Math.floor(100 / assessmentStack.length);
  const remainder = 100 - baseWeight * assessmentStack.length;
  return assessmentStack.reduce<Record<string, number>>((weights, name, index) => {
    weights[name] = baseWeight + (index < remainder ? 1 : 0);
    return weights;
  }, {});
}

function getCampaignWeights(
  assessmentStack: string[],
  assessmentSettings?: Record<string, unknown> | null
) {
  const rawWeights =
    assessmentSettings &&
    typeof assessmentSettings.weights === "object" &&
    assessmentSettings.weights !== null &&
    !Array.isArray(assessmentSettings.weights)
      ? (assessmentSettings.weights as Record<string, unknown>)
      : null;

  if (!rawWeights) return buildEqualWeights(assessmentStack);

  return assessmentStack.reduce<Record<string, number>>((weights, assessmentName) => {
    const matchedEntry = Object.entries(rawWeights).find(([key]) => isSameAssessment(assessmentName, key));
    const numericValue = matchedEntry ? Number(matchedEntry[1]) : Number.NaN;
    weights[assessmentName] = Number.isFinite(numericValue) ? numericValue : 0;
    return weights;
  }, {});
}

function isSameAssessment(expectedName?: string | null, resultName?: string | null) {
  const expectedKey = getAssessmentKey(expectedName);
  const resultKey = getAssessmentKey(resultName);

  if (expectedKey && resultKey) return expectedKey === resultKey;

  const expected = normalizeAssessmentText(expectedName);
  const result = normalizeAssessmentText(resultName);
  return (expected && result) ? (expected.includes(result) || result.includes(expected)) : false;
}

function normalizeAssessmentText(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .replace(/prioritization/g, "prioritisation")
    .replace(/[^a-z0-9]/g, "");
}

function getAssessmentKey(value?: string | null) {
  const normalized = normalizeAssessmentText(value);

  if (normalized.includes("prioritisation") || normalized === "pja") {
    return "prioritisation";
  }
  if (normalized.includes("situationaljudgement") || normalized === "sjt") {
    return "situational-judgement";
  }
  if (normalized.includes("callsimulation")) {
    return "call-simulation";
  }
  if (normalized.includes("typing")) {
    return "typing";
  }

  return "";
}

function getRating(overallScore: number) {
  if (overallScore >= 75) {
    return {
      label: "Strong Match",
      tone: "text-emerald-400",
      badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.06)]"
    };
  }
  if (overallScore >= 55) {
    return {
      label: "Move Forward",
      tone: "text-sky-400",
      badge: "bg-sky-500/10 text-sky-400 border-sky-500/25 shadow-[0_0_15px_rgba(14,165,233,0.06)]"
    };
  }
  if (overallScore >= 35) {
    return {
      label: "Hold / Under Review",
      tone: "text-amber-400",
      badge: "bg-amber-500/10 text-amber-400 border-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.06)]"
    };
  }
  return {
    label: "Review Carefully",
    tone: "text-red-400",
    badge: "bg-red-500/10 text-red-400 border-red-500/25 shadow-[0_0_15px_rgba(239,68,68,0.06)]"
  };
}

function buildAssessmentRows(
  assessmentStack: string[],
  results: HiringManagerAssessmentResult[] = [],
  assessmentSettings?: Record<string, unknown> | null
): AssessmentReportRow[] {
  const expectedAssessments = assessmentStack.length
    ? assessmentStack
    : results.map((result) => result.assessment);
  const weights = getCampaignWeights(expectedAssessments, assessmentSettings);

  return expectedAssessments.map((name) => {
    const result =
      results.find((candidateResult) =>
        isSameAssessment(name, candidateResult.assessment)
      ) ?? null;
    const score = result?.numericScore ?? null;
    const weight = weights[name] ?? 0;

    return {
      name,
      weight,
      result,
      score,
      contribution: score === null ? 0 : Number(((score * weight) / 100).toFixed(2)),
    };
  });
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function formatCompletion(value?: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getTypingRuns(metrics?: Record<string, unknown> | null) {
  const runs = metrics?.assessmentRuns;
  return Array.isArray(runs) ? (runs as TypingRunMetric[]) : [];
}

function getCallSimulationRuns(result?: HiringManagerAssessmentResult | null) {
  const rawCalls = result?.rawData?.calls;
  const rawSnapshots = result?.rawData?.snapshots;
  const metricCalls = result?.metrics?.calls;
  const runs = Array.isArray(metricCalls)
      ? metricCalls
      : Array.isArray(rawCalls)
        ? rawCalls
        : Array.isArray(rawSnapshots)
          ? rawSnapshots
          : [];

  return runs as CallSimulationRun[];
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return "Not recorded";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function getAssessmentStatus(row: AssessmentReportRow) {
  if (row.score === null) {
    return {
      label: "Awaiting Completion",
      className: "bg-amber-500/10 text-amber-400 border-none hover:bg-amber-500/10",
    };
  }
  if (row.result?.passed === false) {
    return {
      label: "Review Required",
      className: "bg-red-500/10 text-red-400 border-none hover:bg-red-500/10",
    };
  }
  return {
    label: "Completed",
    className: "bg-emerald-500/10 text-emerald-400 border-none hover:bg-emerald-500/10",
  };
}

function getAssessmentIcon(name: string) {
  const lowercase = name.toLowerCase();
  if (lowercase.includes("typing")) {
    return Keyboard;
  }
  if (lowercase.includes("prioriti") || lowercase.includes("order")) {
    return ClipboardList;
  }
  if (lowercase.includes("judgement") || lowercase.includes("sjt") || lowercase.includes("behavior")) {
    return BrainCircuit;
  }
  if (lowercase.includes("call") || lowercase.includes("audio") || lowercase.includes("simulat")) {
    return PhoneCall;
  }
  return FileQuestion;
}

const COMPETENCY_FLOORS: Record<string, number> = {
  C1: 55,
  C2: 55,
  C3: 60,
  C4: 45,
  C5: 55,
  C6: 40,
};

const CALL_TRANSCRIPT_DATA = [
  { speaker: "OPERATOR", text: "Hello, this is the police. What is your emergency?", time: "0:00", sec: 0 },
  { speaker: "CALLER", text: "I've just seen someone break into a car outside my flat. They've smashed the window, and they're going through it now.", time: "0:02", sec: 2, highlights: ["break into a car", "smashed the window"] },
  { speaker: "OPERATOR", text: "Okay, I'm creating a report for a theft from motor vehicle in progress and will get police on the way as soon as I have confirmed some information with you.", time: "0:08", sec: 8, highlights: ["theft from motor vehicle in progress"] },
  { speaker: "OPERATOR", text: "What is the exact location of the vehicle?", time: "0:15", sec: 15 },
  { speaker: "CALLER", text: "It's outside 18 Camden Grove, postcode S E 1 5, 3 X B.", time: "0:17", sec: 17, highlights: ["18 Camden Grove", "SE15 3XB"] },
  { speaker: "OPERATOR", text: "Got it, 18 Camden Grove, SE, 1, 5, 3, XB. And is the suspect still there?", time: "0:21", sec: 21 },
  { speaker: "CALLER", text: "Yes, he's still there. He's leaning inside the car now.", time: "0:27", sec: 27 },
  { speaker: "OPERATOR", text: "Okay, I’m going to take a description of the suspect from you now. Can you tell me what he looks like please?", time: "0:30", sec: 30 },
  { speaker: "CALLER", text: "Yes. He's a white male, about 30 years old, wearing a black jacket and grey jogging bottoms.", time: "0:35", sec: 35, highlights: ["white male", "30 years old", "black jacket", "grey jogging bottoms"] },
  { speaker: "OPERATOR", text: "Is anyone else with him?", time: "0:43", sec: 43 },
  { speaker: "CALLER", text: "No, I can’t see anyone with him.", time: "0:45", sec: 45 },
  { speaker: "OPERATOR", text: "Have you seen any weapons?", time: "0:47", sec: 47 },
  { speaker: "CALLER", text: "It looks like he's used a hammer to smash the window.", time: "0:49", sec: 49, highlights: ["hammer"] },
  { speaker: "OPERATOR", text: "Officers are on the way. They will be there within 15 minutes on our emergency response. Do you know who owns the vehicle?", time: "0:55", sec: 55, highlights: ["15 minutes", "emergency response"] },
  { speaker: "CALLER", text: "No, I don't. It's a silver Toyota Yaris, but I don't know whose it is.", time: "1:03", sec: 63, highlights: ["silver Toyota Yaris"] },
  { speaker: "OPERATOR", text: "Can you give me the vehicle registration number?", time: "1:07", sec: 67 },
  { speaker: "CALLER", text: "Yeah, I can. It's H N, 2 8, Y J, W. That's H, N, two, eight, Y, J W.", time: "1:10", sec: 70, highlights: ["HN28 YJW"] },
  { speaker: "OPERATOR", text: "Thanks. And what's your name?", time: "1:19", sec: 79 },
  { speaker: "CALLER", text: "My name is Jessie Peres.", time: "1:21", sec: 81, highlights: ["Jessie Peres"] },
  { speaker: "OPERATOR", text: "Thank you, Jessie. Can you spell your name, please?", time: "1:23", sec: 83 },
  { speaker: "CALLER", text: "Yes. It's J E S S I E. And my surname is P E R E S.", time: "1:25", sec: 85, highlights: ["J E S S I E", "P E R E S"] },
  { speaker: "OPERATOR", text: "And what is your date of birth Jessie?", time: "1:33", sec: 93 },
  { speaker: "CALLER", text: "It's 14th February 1991.", time: "1:35", sec: 95, highlights: ["14th February 1991"] },
  { speaker: "OPERATOR", text: "Thanks. Can I get your telephone number, Jessie?", time: "1:41", sec: 101 },
  { speaker: "CALLER", text: "Yes. It's 0, 7, 7, 0, 0, 9, 3, 8, 2, 1, 6,.", time: "1:44", sec: 104, highlights: ["07700938216"] },
  { speaker: "OPERATOR", text: "Thank you. And are you calling from the scene or somewhere else?", time: "1:51", sec: 111 },
  { speaker: "CALLER", text: "My name is Jessie Peres.", time: "1:53", sec: 113, highlights: ["16 Camden Grove", "SE15 3XB"] },
  { speaker: "OPERATOR", text: "Okay, so that's number 16 Camden Grove, S, E, 1, 5, 3, X, B,. I’m going to give you an incident reference number, do you have something to write it down with?", time: "2:00", sec: 120 },
  { speaker: "CALLER", text: "Yes, go ahead.", time: "2:05", sec: 125 },
  { speaker: "OPERATOR", text: "Your incident reference number is 4, 6, 1, 9, 5. Please stay inside, keep yourself safe, and call us back if anything changes.", time: "2:06", sec: 126, highlights: ["46195"] },
];

function CallTranscriptPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTime((t) => {
        if (t >= 126) {
          setIsPlaying(false);
          return 126;
        }
        return t + 1;
      });
    }, 1000 / playbackRate);
    return () => clearInterval(interval);
  }, [isPlaying, playbackRate]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? "0" : ""}${rem}`;
  };

  const activeTurnIndex = [...CALL_TRANSCRIPT_DATA]
    .reverse()
    .find((turn) => currentTime >= turn.sec)
    ? CALL_TRANSCRIPT_DATA.indexOf(
        [...CALL_TRANSCRIPT_DATA]
          .reverse()
          .find((turn) => currentTime >= turn.sec)!
      )
    : 0;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(Number(e.target.value));
  };

  const highlightText = (text: string, highlights?: string[]) => {
    if (!highlights || highlights.length === 0) return text;
    let parts: React.ReactNode[] = [text];
    
    highlights.forEach((hl) => {
      const newParts: React.ReactNode[] = [];
      parts.forEach((part) => {
        if (typeof part === "string") {
          const index = part.toLowerCase().indexOf(hl.toLowerCase());
          if (index !== -1) {
            newParts.push(part.substring(0, index));
            newParts.push(
              <span
                key={hl + index}
                className="bg-cyan-500/20 text-cyan-200 border-b border-dashed border-cyan-400 font-semibold px-0.5 rounded"
                title="AI Evaluated Key Point"
              >
                {part.substring(index, index + hl.length)}
              </span>
            );
            newParts.push(part.substring(index + hl.length));
          } else {
            newParts.push(part);
          }
        } else {
          newParts.push(part);
        }
      });
      parts = newParts;
    });
    
    return parts;
  };

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden space-y-4">
      {/* Player HUD Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.02] border-b border-white/5 p-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-9 w-9 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
          >
            {isPlaying ? <Pause className="h-[18px] w-[18px]" /> : <Play className="h-[18px] w-[18px]" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => { setCurrentTime(0); setIsPlaying(false); }}
            className="h-8 w-8 rounded-full text-slate-400 hover:text-white"
            title="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <div className="text-xs font-mono text-slate-300">
            <span>{formatTime(currentTime)}</span>
            <span className="text-slate-600 px-1">/</span>
            <span>2:06</span>
          </div>
        </div>

        {/* Timeline Progress Slider */}
        <div className="flex-1 w-full px-2">
          <input
            type="range"
            min="0"
            max="126"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 rounded-lg bg-white/10 accent-primary cursor-pointer hover:bg-white/20 transition-all"
          />
        </div>

        {/* Speed & Volume details */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-white/5 overflow-hidden">
            {[1.0, 1.5, 2.0].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setPlaybackRate(rate)}
                className={`px-2 py-1 text-[10px] font-bold ${
                  playbackRate === rate
                    ? "bg-primary text-white"
                    : "text-slate-400 hover:text-white bg-transparent"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Volume2 className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Simulated</span>
          </div>
        </div>
      </div>

      {/* Transcript Chat Display bubbles */}
      <div className="p-4 max-h-[360px] overflow-y-auto space-y-3 custom-scrollbar scroll-smooth">
        {CALL_TRANSCRIPT_DATA.map((turn, idx) => {
          const isOperator = turn.speaker === "OPERATOR";
          const isActive = idx === activeTurnIndex;
          
          return (
            <button
              key={turn.sec + idx}
              type="button"
              onClick={() => setCurrentTime(turn.sec)}
              className={`w-full flex text-left transition-all duration-300 rounded-xl p-1 focus:outline-none ${
                isOperator ? "justify-start" : "justify-end"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs transition-all duration-300 border ${
                  isActive
                    ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(99,102,241,0.1)] scale-[1.01]"
                    : isOperator
                    ? "bg-slate-800/40 border-slate-700/30 text-slate-300 hover:border-slate-600/40"
                    : cn(portalMutedBubbleClass, "border")
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold uppercase text-[9px] tracking-wider text-slate-500 mb-1">
                  {isOperator ? <User className="h-3 w-3 text-sky-400" /> : <Phone className="h-3 w-3 text-indigo-400" />}
                  <span>{turn.speaker}</span>
                  <span className="text-slate-700 font-normal">•</span>
                  <span className="font-mono text-slate-400">{turn.time}</span>
                </div>
                <p className="leading-relaxed">{highlightText(turn.text, turn.highlights)}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function HiringManagerCandidateReport({ candidateId, campaignId, candidateSessionId, embedded = false }: CandidateReportProps) {
  const [reportData, setReportData] = useState<CandidateReportData | null>(null);
  const [decision, setDecision] = useState<"Move forward" | "Reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openBreakdownKey, setOpenBreakdownKey] = useState<string | null>(null);
  const [selectedCallRunIndex, setSelectedCallRunIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setIsLoading(true);
      setError(null);
      try {
        const campaigns = campaignId
          ? [
              await HiringManagerPortalClientService.getCampaignDetail(campaignId),
            ].filter(Boolean) as HiringManagerCampaignDetail[]
          : await HiringManagerPortalClientService.getCampaignDetails();
        const matched = campaigns
          .flatMap((campaign) =>
            campaign.joinedCandidates.map((candidate) => ({ candidate, campaign }))
          )
          .find((item) =>
            candidateSessionId
              ? item.candidate.id === candidateSessionId
              : item.candidate.id === candidateId
          );

        if (!cancelled) {
          setReportData(matched ?? null);
          if (!matched) {
            setError("Candidate report could not be found.");
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Candidate report could not be loaded."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [candidateId, campaignId, candidateSessionId]);

  const rows = useMemo(() => {
    if (!reportData) return [];
    return buildAssessmentRows(
      reportData.candidate.assessmentStack ?? reportData.campaign.assessmentStack,
      reportData.candidate.results,
      reportData.campaign.assessmentSettings
    );
  }, [reportData]);

  const completedRows = rows.filter((row) => row.score !== null);
  const allAssessmentsCompleted = rows.length > 0 && completedRows.length === rows.length;
  const overallScore = Math.round(rows.reduce((total, row) => total + row.contribution, 0));
  const rating = getRating(overallScore);
  const displayedRating = allAssessmentsCompleted
    ? rating
    : {
        label: "Pending Completion",
        tone: "text-amber-300",
        badge: "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-none"
      };

  if (isLoading) {
    return (
      <div className={cn(portalPanelNestedClass, "rounded-lg p-6 text-sm text-muted-foreground")}>
        Loading candidate report...
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="max-w-5xl space-y-4">
        {!embedded && (
          <Button
            variant="outline"
            className="h-9 rounded-md border-white/10 bg-white/[0.02] px-3 text-sm text-slate-100 hover:bg-white/[0.05]"
            asChild
          >
            <Link href="/hiring-manager-dashboard/candidates/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to candidates
            </Link>
          </Button>
        )}
        <div className="rounded-lg border border-red-400/20 bg-red-400/10 p-6 text-sm text-red-100">
          {error || "Candidate report could not be found."}
        </div>
      </div>
    );
  }

  const { candidate, campaign } = reportData;

  return (
    <div className="max-w-full overflow-x-hidden space-y-6">
      {/* Premium Header Card */}
      {!embedded && (
        <div className={cn(portalHeroPanelClass, "p-6")}>
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          
          <div className="relative space-y-4">
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="outline"
                className="h-8 rounded-lg border-white/10 bg-white/[0.02] px-3 text-xs font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white shrink-0"
                asChild
              >
                <Link href="/hiring-manager-dashboard/candidates/">
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  Back to candidates
                </Link>
              </Button>

              {/* Centered Candidate Report Badge */}
              <div className="flex justify-center sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:top-1/2 sm:-translate-y-1/2 shrink-0">
                <Badge className="pointer-events-none rounded-md bg-indigo-500/10 text-indigo-400 border-none px-2.5 py-0.5 text-xs font-semibold">
                  Candidate Report
                </Badge>
              </div>
              
              {allAssessmentsCompleted && (
                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 shrink-0">
                  <Button
                    type="button"
                    onClick={() => setDecision("Reject")}
                    className="h-[34px] rounded-lg bg-red-500/10 border border-red-500/20 px-3.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all"
                  >
                    <ThumbsDown className="mr-1.5 h-3.5 w-3.5" />
                    Reject
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setDecision("Move forward")}
                    className={cn(portalSuccessButtonClass, "h-[34px]")}
                  >
                    <ThumbsUp className="mr-1.5 h-3.5 w-3.5 text-slate-950" />
                    Pass
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-2.5 pt-1">
              <div>
                <h1 className="break-words text-2xl font-black tracking-tight text-white sm:text-3xl flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span>{candidate.name}</span>
                  <span className="text-slate-600 font-normal text-lg">•</span>
                  <span className="text-sm font-medium text-slate-400">{candidate.email || "No email listed"}</span>
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
                  <span>Campaign: <strong className="text-slate-200">{campaign.name}</strong></span>
                  {candidate.sessionName && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span>Session Date: <strong className="text-slate-200">{candidate.sessionName}</strong></span>
                    </>
                  )}
                  {campaign.role && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span>Role: <strong className="text-slate-200">{campaign.role}</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}




      {decision && (
        <div className={cn(
          "flex items-center justify-between text-sm shadow-sm",
          decision === "Move forward" ? portalAlertInfoClass : portalAlertErrorClass
        )}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span>Candidate decision finalized: <strong className="text-white uppercase font-bold tracking-wider">{decision}</strong></span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDecision(null)}
            className="text-slate-400 hover:text-white hover:bg-white/10 h-7 text-[11px]"
          >
            Reset decision
          </Button>
        </div>
      )}

      {/* Weighted Score Summary & Radar Chart */}
      <div>
        <Card className={cn(portalPanelClass, "relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md")}>
          <CardContent className="relative p-6">
            <div className="flex flex-col justify-between space-y-5">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs uppercase text-slate-500 font-semibold tracking-wider">
                    Weighted Score
                  </span>
                  <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${displayedRating.badge}`}>
                    {displayedRating.label}
                  </span>
                </div>

                <div className="mt-4 flex items-end gap-1.5">
                  <span className="text-5xl font-black leading-none text-white tabular-nums">
                    {overallScore}
                  </span>
                  <span className="text-sm font-bold text-slate-500">/100</span>
                </div>
              </div>

              <div>
                <div className="flex min-w-0 flex-col items-start gap-1.5 pb-0.5">
                  <span className="text-xs uppercase text-slate-500 font-semibold tracking-wider">
                    Completion Status
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {rows.map((row, idx) => {
                      const isDone = row.score !== null;
                      return (
                        <div
                          key={`${row.name}-${idx}`}
                          title={`${row.name}: ${isDone ? "Completed" : "Pending"}`}
                          className={`h-2.5 w-7 rounded-full transition-all duration-300 ${
                            isDone
                              ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)] animate-in fade-in duration-300"
                              : "bg-white/10 border border-white/5"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="relative h-3 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
                    <div
                      className={portalScoreMeterClass}
                      style={{ width: `${Math.max(0, Math.min(100, overallScore))}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-slate-600">
                    <span>0</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assessment Breakdown List */}
      <Card className={cn(portalPanelElevatedClass, "rounded-2xl")}>
        <CardHeader className="border-b border-white/10 p-5">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Assessment breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          {rows.map((row) => {
            const Icon = getAssessmentIcon(row.name);
            const status = getAssessmentStatus(row);
            const typingRuns = getTypingRuns(row.result?.metrics);
            const scoreValue = row.score ?? 0;
            const key = getAssessmentKey(row.name);
            const isPrioritisation = key === "prioritisation";
            const isSJT = key === "situational-judgement";
            const isCallSimulation = key === "call-simulation";
            const hasBreakdown =
              typingRuns.length > 0 ||
              (row.result?.wpm !== null && row.result?.wpm !== undefined) ||
              (row.score !== null && (isPrioritisation || isSJT || isCallSimulation) && row.result?.metrics !== null && row.result?.metrics !== undefined);
            const breakdownOpen = openBreakdownKey === row.name;

            return (
              <div
                key={row.name}
                className={cn(portalPanelNestedClass, "space-y-4 p-5 hover:border-primary/30 transition-all duration-300")}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${row.score !== null ? 'border-primary/20 bg-primary/5 text-primary' : 'border-white/10 bg-white/5 text-slate-500'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-base font-bold text-white">
                          {row.name}
                        </h3>
                        <Badge className={[
                          "rounded-md border-none text-xs font-semibold px-2 py-0.5",
                          status.className
                        ].join(" ")}>
                          {status.label}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                        <Clock3 className="h-3 w-3" />
                        Completed: {formatCompletion(row.result?.completedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[320px]">
                    <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3">
                      <p className="text-xs text-slate-500 font-medium">Assessment Score</p>
                      <p className="mt-1 text-lg font-bold text-white">
                        {row.score === null ? "Pending" : `${row.score}%`}
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3">
                      <p className="text-xs text-slate-500 font-medium">Overall Contribution</p>
                      <p className="mt-1 text-lg font-bold text-indigo-400">
                        {row.score === null ? "Pending" : formatPercent(row.contribution)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-12 pt-3 border-t border-white/5">
                  <div className="space-y-2 md:col-span-8 rounded-lg border border-white/5 bg-white/[0.01] p-3">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-slate-400 font-medium">Score against assessment weighting</span>
                      <span className="text-slate-200 font-semibold">
                        {row.score === null ? "Awaiting submission" : `${row.score}% of ${row.weight}% weight`}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={portalProgressBarClass}
                        style={{ width: `${scoreValue}%` }}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-4 rounded-lg border border-white/5 bg-white/[0.01] p-3 flex flex-col justify-between">
                    <p className="text-xs text-slate-500 font-medium">Result status</p>
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-200 font-semibold">
                      {row.score !== null ? (
                        <CheckCircle2 className="h-[18px] w-[18px] text-emerald-400" />
                      ) : (
                        <Clock3 className="h-[18px] w-[18px] text-amber-400 animate-pulse" />
                      )}
                      {row.score !== null ? "Submitted & Verified" : "Awaiting candidate"}
                    </div>
                  </div>
                </div>

                {hasBreakdown && (
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpenBreakdownKey(breakdownOpen ? null : row.name)}
                        className="h-9 rounded-md border-white/10 bg-white/[0.02] px-3.5 text-xs text-slate-200 hover:bg-white/[0.05] hover:text-white"
                      >
                        <ChevronDown
                          className="mr-1.5 h-3.5 w-3.5"
                          style={{
                            transform: breakdownOpen ? "rotate(-180deg)" : "rotate(0deg)",
                            transition: "transform 300ms ease",
                          }}
                        />
                        {breakdownOpen ? "Hide performance breakdown" : "View performance breakdown"}
                        <ChevronDown
                          className="ml-1.5 h-3.5 w-3.5"
                          style={{
                            transform: breakdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 300ms ease",
                          }}
                        />
                      </Button>
                    </div>

                    {breakdownOpen && (
                      <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-4">
                        {row.result?.wpm !== null && row.result?.wpm !== undefined && (
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
                              <p className="text-xs text-slate-500 font-medium">Average Speed</p>
                              <p className="mt-1.5 text-2xl font-black text-white">
                                {row.result.wpm} <span className="text-xs font-semibold text-slate-400">WPM</span>
                              </p>
                            </div>
                            <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
                              <p className="text-xs text-slate-500 font-medium">Average Accuracy</p>
                              <p className="mt-1.5 text-2xl font-black text-emerald-400">
                                {row.result.accuracy ?? "—"}%
                              </p>
                            </div>
                            <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
                              <p className="text-xs text-slate-500 font-medium">Total Mistakes</p>
                              <p className="mt-1.5 text-2xl font-black text-red-400">
                                {row.result.mistakeCount ?? "—"}
                              </p>
                            </div>
                          </div>
                        )}

                        {typingRuns.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                              Detailed Typing Run Performance
                            </p>
                            <div className={portalCodeSurfaceClass}>
                              <table className="w-full max-w-full table-fixed text-left border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-white/15 bg-white/[0.03] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                                    <th className="p-3">Run</th>
                                    <th className="p-3 text-right">WPM</th>
                                    <th className="p-3 text-right">Accuracy</th>
                                    <th className="p-3 text-right">Mistakes</th>
                                    <th className="p-3 text-right">Characters (Correct/Total)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-slate-200 font-medium">
                                  {typingRuns.map((run, index) => (
                                    <tr key={`${row.name}-${run.runIndex ?? index}`} className="hover:bg-white/[0.02] transition-colors">
                                      <td className="p-3 text-slate-300 font-bold">Run {run.runIndex ?? index + 1}</td>
                                      <td className="p-3 text-right text-white font-extrabold">{run.wpm ?? "—"}</td>
                                      <td className="p-3 text-right text-emerald-400 font-extrabold">{run.accuracy ?? "—"}%</td>
                                      <td className="p-3 text-right text-red-400 font-extrabold">{run.mistakeCharacters ?? "0"}</td>
                                      <td className="p-3 text-right text-slate-400">{run.correctCharacters ?? 0} / {run.typedCharacters ?? 0}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {isPrioritisation && row.result?.metrics && (() => {
                          const pjaMetrics = row.result.metrics as any;
                          return (
                            <div className="space-y-4">
                              <div className="space-y-3.5 rounded-lg border border-white/5 bg-white/[0.01] p-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                  Priority Band Accuracy
                                </p>
                                <div className="space-y-3">
                                  {[
                                    { label: "High Priority", score: pjaMetrics.highPriorityAccuracy ?? 0, color: "bg-emerald-500", textColor: "text-emerald-400" },
                                    { label: "Medium Priority", score: pjaMetrics.mediumPriorityAccuracy ?? 0, color: "bg-sky-500", textColor: "text-sky-400" },
                                    { label: "Low Priority", score: pjaMetrics.lowPriorityAccuracy ?? 0, color: "bg-slate-400", textColor: "text-slate-400" }
                                  ].map((band) => (
                                    <div key={band.label} className="space-y-1.5">
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-300 font-medium">{band.label}</span>
                                        <span className={`font-bold ${band.textColor}`}>{Math.round(band.score)}%</span>
                                      </div>
                                      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${band.color}`}
                                          style={{ width: `${band.score}%` }}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
                                  <p className="text-xs text-slate-500 font-medium">Outcome Band</p>
                                  <p className="mt-1.5 text-lg font-bold text-white">
                                    {pjaMetrics.performanceBand ?? pjaMetrics.outcome ?? "—"}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
                                  <p className="text-xs text-slate-500 font-medium">Critical Misprioritisations</p>
                                  <p className={`mt-1.5 text-lg font-bold ${pjaMetrics.criticalMisprioritisationCount > 0 ? "text-rose-400" : "text-white"}`}>
                                    {pjaMetrics.criticalMisprioritisationCount ?? 0}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {isSJT && row.result?.metrics && (() => {
                          const sjtMetrics = row.result.metrics as any;
                          return (
                            <div className="space-y-4">
                              <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
                                  <p className="text-xs text-slate-500 font-medium">Decision Band</p>
                                  <p className={`mt-1.5 text-2xl font-black ${
                                    sjtMetrics.decisionBand === 'GREEN' ? "text-emerald-400" :
                                    sjtMetrics.decisionBand === 'AMBER' ? "text-amber-400" : "text-rose-400"
                                  }`}>
                                    {sjtMetrics.decisionBand ?? "—"}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
                                  <p className="text-xs text-slate-500 font-medium">Material Risk Flags</p>
                                  <p className={`mt-1.5 text-2xl font-black ${sjtMetrics.materialRiskFlagCount > 0 ? "text-rose-400 font-bold" : "text-white"}`}>
                                    {sjtMetrics.materialRiskFlagCount ?? 0}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
                                  <p className="text-xs text-slate-500 font-medium">Moderate Risk Flags</p>
                                  <p className="mt-1.5 text-2xl font-black text-white">
                                    {sjtMetrics.moderateRiskFlagCount ?? 0}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                  Competency Scores
                                </p>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  {Object.entries(sjtMetrics.competencyScores || {}).map(([key, score]: any) => {
                                    const label = sjtMetrics.competencyLabels?.[key] || key;
                                    const floor = COMPETENCY_FLOORS[key] ?? 50;
                                    const isBelowFloor = score < floor;
                                    
                                    return (
                                      <div key={key} className="rounded-lg border border-white/5 bg-white/[0.01] p-3 space-y-2">
                                        <div className="flex justify-between items-start text-xs">
                                          <span className="text-slate-300 font-medium line-clamp-1" title={label}>{label}</span>
                                          <span className={`font-bold ${isBelowFloor ? "text-red-400" : "text-white"}`}>{Math.round(score)}%</span>
                                        </div>
                                        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden relative">
                                          <div
                                            className={`h-full rounded-full ${isBelowFloor ? "bg-red-500" : "bg-primary"}`}
                                            style={{ width: `${score}%` }}
                                          />
                                          {/* safety floor indicator mark */}
                                          <div 
                                            className="absolute top-0 bottom-0 w-0.5 bg-red-400/50"
                                            style={{ left: `${floor}%` }}
                                            title={`Safety Floor: ${floor}%`}
                                          />
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                                          <span>Floor: {floor}%</span>
                                          {isBelowFloor && <span className="text-red-400 font-semibold">Below Floor</span>}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {isCallSimulation && row.result?.metrics && (() => {
                          const callsList = getCallSimulationRuns(row.result);
                          const finalRuns = callsList.filter((c) => c.metrics);
                          
                          let activeMetrics = row.result.metrics as any;
                          let activeRunIndex = selectedCallRunIndex;
                          
                          if (finalRuns.length > 0) {
                            if (activeRunIndex === null || !finalRuns.some((f) => f.runIndex === activeRunIndex)) {
                              activeRunIndex = finalRuns[0].runIndex;
                            }
                            const matchedRun = finalRuns.find((f) => f.runIndex === activeRunIndex);
                            if (matchedRun?.metrics) {
                              activeMetrics = matchedRun.metrics;
                            }
                          }
                          
                          const sectionLabels: Record<string, string> = {
                            caller_information: "Caller Information",
                            system_information: "System Information",
                            intelligence_information: "Intelligence Information",
                            incident_information: "Incident Information",
                          };
                          
                          const secKeys = ['caller_information', 'system_information', 'intelligence_information', 'incident_information'];
                          
                          return (
                            <div className="space-y-5">
                              {/* Run Selector Tabs */}
                              {finalRuns.length > 1 && (
                                <div className="flex flex-wrap items-center gap-1.5 border-b border-white/5 pb-3">
                                  <span className="text-xs font-semibold text-slate-400 mr-2">Select Call:</span>
                                  {finalRuns.map((run, idx: number) => {
                                    const isSelected = activeRunIndex === run.runIndex;
                                    return (
                                      <Button
                                        key={run.runIndex}
                                        type="button"
                                        variant={isSelected ? "default" : "outline"}
                                        onClick={() => setSelectedCallRunIndex(run.runIndex)}
                                        className={`h-7 px-3 text-[11px] font-bold rounded-lg transition-all ${
                                          isSelected
                                            ? "bg-primary text-white shadow-lg"
                                            : "text-slate-300 hover:text-white hover:bg-white/5 border-white/10"
                                        }`}
                                      >
                                        Call {idx + 1} {run.metrics?.passed ? " (Pass)" : " (Review)"}
                                      </Button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Summary Stats Cards */}
                              <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
                                  <p className="text-xs text-slate-500 font-medium">Scoring Outcome</p>
                                  <p className={`mt-1.5 text-2xl font-black ${
                                    activeMetrics.passed ? "text-emerald-400" : "text-rose-400"
                                  }`}>
                                    {activeMetrics.passed ? "PASSED" : "FAILED"}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
                                  <p className="text-xs text-slate-500 font-medium">Critical Errors</p>
                                  <p className={`mt-1.5 text-2xl font-black ${activeMetrics.criticalErrorsCount > 0 ? "text-rose-400 font-bold" : "text-white"}`}>
                                    {activeMetrics.criticalErrorsCount ?? 0}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
                                  <p className="text-xs text-slate-500 font-medium">Marks Awarded</p>
                                  <p className="mt-1.5 text-2xl font-black text-white">
                                    {activeMetrics.totalEarnedScore ?? "0"} <span className="text-xs font-semibold text-slate-400">/ {activeMetrics.maxScore ?? "5.0"}</span>
                                  </p>
                                </div>
                              </div>

                              {/* Section Scores Progress bars */}
                              <div className="space-y-3.5 rounded-lg border border-white/5 bg-white/[0.01] p-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                  Section Performance Breakdown
                                </p>
                                <div className="grid gap-4 sm:grid-cols-2">
                                  {secKeys.map((secKey) => {
                                    const sec = activeMetrics.sections?.[secKey] || { score: 0, max: 1.0 };
                                    const pct = Math.round((sec.score / sec.max) * 100);
                                    
                                    return (
                                      <div key={secKey} className="space-y-1.5">
                                        <div className="flex justify-between items-center text-xs">
                                          <span className="text-slate-300 font-medium">{sectionLabels[secKey] || secKey}</span>
                                          <span className="font-bold text-white">{sec.score} / {sec.max} ({pct}%)</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                                          <div
                                            className={portalProgressBarClass}
                                            style={{ width: `${pct}%` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Detailed Criteria Table */}
                              {(() => {
                                const criteriaList = activeMetrics.criteria || finalRuns[0]?.metrics?.criteria || [];
                                const getRunScore = (runIndex: number, criterionKey: string) => {
                                  const run = finalRuns.find((r) => r.runIndex === runIndex);
                                  const crit = run?.metrics?.criteria?.find((c: any) => c.key === criterionKey);
                                  return crit ? `${crit.score} / ${crit.maxScore}` : '—';
                                };

                                if (criteriaList.length === 0) return null;

                                return (
                                  <div className="space-y-2.5">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                      Logged Information Details
                                    </p>
                                    <div className={portalCodeSurfaceClass}>
                                      <table className="w-full max-w-full table-fixed text-left border-collapse text-xs">
                                        <thead>
                                          <tr className="border-b border-white/15 bg-white/[0.03] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                                            <th className="p-3">Criterion</th>
                                            {finalRuns.length > 1 ? (
                                              <>
                                                <th className="p-3 text-right">Run 1 Score</th>
                                                <th className="p-3 text-right">Run 2 Score</th>
                                              </>
                                            ) : (
                                              <th className="p-3 text-right">Score</th>
                                            )}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-slate-200 font-medium">
                                          {criteriaList.map((crit: any) => {
                                            return (
                                              <tr key={crit.key} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="p-3 text-slate-300">
                                                  <div className="font-bold flex items-center gap-1.5">
                                                    {crit.displayName}
                                                    {crit.critical && (
                                                      <span className="text-[9px] font-black uppercase bg-red-500/20 text-red-400 px-1 py-0.5 rounded border border-red-500/30">
                                                        CRITICAL
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                                    Section: {sectionLabels[crit.section] || crit.section}
                                                  </div>
                                                  
                                                  <div className="mt-2.5 flex flex-col gap-1 text-[11px] bg-white/[0.02] border border-white/5 rounded-lg p-2 max-w-md">
                                                    <div className="flex justify-between items-center gap-2">
                                                      <span className="text-slate-500">Logged Value:</span>
                                                      <span className="text-white font-semibold truncate max-w-[280px]">
                                                        {crit.value || <span className="text-slate-600 italic">None</span>}
                                                      </span>
                                                    </div>
                                                    {crit.valueAt4 !== undefined && crit.valueAt4 !== null && (
                                                      <div className="flex justify-between items-center gap-2 border-t border-white/5 pt-1 mt-1">
                                                        <span className="text-slate-500">At 4s Checkpoint:</span>
                                                        <span className="text-slate-300 font-medium truncate max-w-[280px]">
                                                          {crit.valueAt4}
                                                        </span>
                                                      </div>
                                                    )}
                                                    {crit.valueAt6 !== undefined && crit.valueAt6 !== null && (
                                                      <div className="flex justify-between items-center gap-2">
                                                        <span className="text-slate-500">At 6s Checkpoint:</span>
                                                        <span className="text-slate-300 font-medium truncate max-w-[280px]">
                                                          {crit.valueAt6}
                                                        </span>
                                                      </div>
                                                    )}
                                                    {crit.timingBand && (
                                                      <div className="flex justify-between items-center gap-2 border-t border-white/5 pt-1 mt-1">
                                                        <span className="text-slate-500">Timing Speed:</span>
                                                        <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                                                          crit.timingBand === "Green" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                                                          crit.timingBand === "Amber" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                                                          "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                                        }`}>
                                                          {crit.timingBand}
                                                        </span>
                                                      </div>
                                                    )}
                                                  </div>
                                                </td>
                                                {finalRuns.length > 1 ? (
                                                  <>
                                                    <td className="p-3 text-right text-white font-extrabold">
                                                      {getRunScore(finalRuns[0].runIndex, crit.key)}
                                                    </td>
                                                    <td className="p-3 text-right text-white font-extrabold">
                                                      {getRunScore(finalRuns[1].runIndex, crit.key)}
                                                    </td>
                                                  </>
                                                ) : (
                                                  <td className="p-3 text-right text-white font-extrabold">
                                                    {crit.score} / {crit.maxScore}
                                                  </td>
                                                )}
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Qualitative Feedback Cards */}
                              {activeMetrics.feedback && (
                                <div className="space-y-2.5">
                                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Qualitative Feedback
                                  </p>
                                  <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3">
                                      <p className="text-[10px] uppercase font-bold text-slate-500">Information Capture</p>
                                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{activeMetrics.feedback.information_capture}</p>
                                    </div>
                                    <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3">
                                      <p className="text-[10px] uppercase font-bold text-slate-500">Timeliness & Dispatch</p>
                                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{activeMetrics.feedback.timeliness}</p>
                                    </div>
                                    <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3">
                                      <p className="text-[10px] uppercase font-bold text-slate-500">Operational Understanding</p>
                                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{activeMetrics.feedback.incident_understanding}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Audio Player & Transcription Sync Console */}
                              <div className="space-y-2.5 pt-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                  Call Audio Recording & Transcription
                                </p>
                                <CallTranscriptPlayer />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>


    </div>
  );
}
