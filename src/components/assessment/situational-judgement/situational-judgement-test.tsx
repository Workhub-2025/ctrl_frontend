'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ListChecks,
  Loader2,
  LogOut,
  MousePointer,
  Play,
  ShieldCheck,
  Target,
  Timer,
} from 'lucide-react';
import { AssessmentGameShell, AssessmentFlowStepper, AssessmentReconnectOverlay, AssessmentPausedScreen } from '@/components/assessment/shared';
import { useAssessmentHeartbeat } from '@/hooks/use-assessment-heartbeat';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { closeAssessmentWindow, notifyAssessmentCompleted } from '@/lib/assessment-completion';
import { getAssessmentSubmitUrl } from '@/assessments/plugins/registry';
import { cn } from '@/lib/utils';
import { initSjaSession } from '@/app/actions/assessment-sja.actions';
import { buildTimedAssessmentSubmitMeta } from '@/lib/assessment-completion-status';
import { STANDARD_ASSESSMENT_TIME_LIMIT_SECONDS } from '@/lib/assessment-catalog-defaults';

type ScenarioOption = {
  id: string;
  text: string;
};

type Scenario = {
  id: string;
  title: string;
  scenario: string;
  prompt: string;
  options: ScenarioOption[];
};

type SjtContent = {
  version?: string;
  sjaRounds: Scenario[];
};

function SJTAnimationPreview() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 6);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  const mostEffective = step >= 2 ? 'A' : null;
  const leastEffective = step >= 4 ? 'D' : null;

  let cursorTop = '10%';
  let cursorLeft = '80%';
  let cursorActive = false;

  if (step === 1) {
    cursorTop = '48%';
    cursorLeft = '83%';
  } else if (step === 2) {
    cursorTop = '48%';
    cursorLeft = '83%';
    cursorActive = true;
  } else if (step === 3) {
    cursorTop = '83%';
    cursorLeft = '83%';
  } else if (step === 4) {
    cursorTop = '83%';
    cursorLeft = '83%';
    cursorActive = true;
  } else if (step === 5) {
    cursorTop = '50%';
    cursorLeft = '90%';
  }

  return (
    <div className="relative w-full rounded-xl border border-border bg-muted/40 p-4 shadow-inner dark:bg-black/20 overflow-hidden min-h-[300px]">
      <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-2 text-xs text-muted-foreground">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Selection Demo</span>
      </div>

      <div className="space-y-3">
        <div className="rounded bg-background p-2.5 text-xs text-foreground border border-border/50 dark:bg-zinc-900/60 select-none">
          <span className="font-bold text-primary block mb-1">Scenario Excerpt:</span>
          A caller reports a package was delayed.
        </div>

        <div className="space-y-2">
          {/* Option A */}
          <div className={cn(
            "relative flex min-h-10 items-center justify-between gap-2 rounded border p-2.5 text-xs transition-all duration-300 select-none",
            mostEffective === 'A'
              ? "border-green-500 bg-green-500/10 text-foreground dark:bg-green-500/5 font-semibold"
              : "border-border/50 bg-background/50 dark:bg-zinc-900/40"
          )}>
            <span className="truncate">A. Apologise immediately & arrange refund.</span>
            <Badge className={cn("shrink-0 bg-green-600 hover:bg-green-600 text-[8px] uppercase px-1.5 py-0", mostEffective !== 'A' && "invisible")}>
              Most Effective
            </Badge>
          </div>

          {/* Option B */}
          <div className="relative flex min-h-10 items-center justify-between gap-2 rounded border border-border/50 bg-background/50 p-2.5 text-xs dark:bg-zinc-900/40 select-none">
            <span className="truncate">B. Explain delay was due to weather.</span>
          </div>

          {/* Option C */}
          <div className="relative flex min-h-10 items-center justify-between gap-2 rounded border border-border/50 bg-background/50 p-2.5 text-xs dark:bg-zinc-900/40 select-none">
            <span className="truncate">C. Tell the caller to track online.</span>
          </div>

          {/* Option D */}
          <div className={cn(
            "relative flex min-h-10 items-center justify-between gap-2 rounded border p-2.5 text-xs transition-all duration-300 select-none",
            leastEffective === 'D'
              ? "border-red-500 bg-red-500/10 text-foreground dark:bg-red-500/5 font-semibold"
              : "border-border/50 bg-background/50 dark:bg-zinc-900/40"
          )}>
            <span className="truncate">D. Ignore the query entirely.</span>
            <Badge className={cn("shrink-0 bg-red-600 hover:bg-red-600 text-[8px] uppercase px-1.5 py-0", leastEffective !== 'D' && "invisible")}>
              Least Effective
            </Badge>
          </div>
        </div>
      </div>

      {/* Virtual Cursor */}
      <div 
        className="absolute z-10 -translate-x-1 -translate-y-1 transition-all duration-700 ease-in-out pointer-events-none"
        style={{ top: cursorTop, left: cursorLeft }}
      >
        <div className="relative">
          <MousePointer className={cn(
            "h-5 w-5 text-foreground drop-shadow-md transition-transform duration-150",
            cursorActive ? "scale-75" : "scale-100"
          )} />
          {cursorActive && (
            <span className="absolute left-0 top-0 h-4 w-4 animate-ping rounded-full bg-primary/40" />
          )}
        </div>
      </div>
    </div>
  );
}

type AssessmentSessionConfig = {
  version?: string;
  difficulty?: string;
  questionCount?: number;
  timeLimitSeconds?: number;
};

type Phase = 'landing' | 'rules' | 'scenario' | 'submitting' | 'submitted';

type SjtResponse = {
  scenarioId: string;
  bestOptionId: string;
  worstOptionId: string;
};

const formatAssessmentMinutes = (seconds: number) =>
  `${Math.max(1, Math.round(seconds / 60))} minutes`;

const formatTimer = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const remainingSeconds = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
};

const fallbackContent: SjtContent = {
  version: '1.0.0',
  sjaRounds: [
    {
      id: 'S1',
      title: 'Emotional overload',
      scenario:
        'You are speaking with someone who is very distressed. They talk quickly, repeat themselves, and jump between points. They sound tearful and occasionally raise their voice.',
      prompt: 'Select the MOST effective and LEAST effective response.',
      options: [
        { id: 'A', text: 'Let them continue uninterrupted so they feel heard, even if it takes time.' },
        { id: 'B', text: 'Calmly acknowledge how they feel, slow the pace, and ask one clear question at a time.' },
        { id: 'C', text: 'Interrupt firmly and tell them to calm down so you can understand them.' },
        { id: 'D', text: 'End the conversation quickly and refer them elsewhere.' },
      ],
    },
  ],
};

export default function SituationalJudgementTest({
  candidateSessionDocumentId,
}: {
  candidateSessionDocumentId?: string | null;
}) {
  const [phase, setPhase] = useState<Phase>('landing');
  const [content, setContent] = useState<SjtContent>(fallbackContent);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [bestOptionId, setBestOptionId] = useState<string | null>(null);
  const [worstOptionId, setWorstOptionId] = useState<string | null>(null);
  const [responses, setResponses] = useState<SjtResponse[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(STANDARD_ASSESSMENT_TIME_LIMIT_SECONDS);
  const [timeRemaining, setTimeRemaining] = useState(STANDARD_ASSESSMENT_TIME_LIMIT_SECONDS);
  const startedAtRef = useRef<string | null>(null);
  const sessionConfigRef = useRef<AssessmentSessionConfig>({});
  const responsesRef = useRef<SjtResponse[]>([]);
  const bestOptionIdRef = useRef<string | null>(null);
  const worstOptionIdRef = useRef<string | null>(null);
  const scenarioIndexRef = useRef(0);
  responsesRef.current = responses;
  bestOptionIdRef.current = bestOptionId;
  worstOptionIdRef.current = worstOptionId;
  scenarioIndexRef.current = scenarioIndex;

  const practiceScenarios = useMemo(() => {
    return content.sjaRounds.filter((s: any) => s.type === 'practice');
  }, [content.sjaRounds]);

  const finalScenarios = useMemo(() => {
    return content.sjaRounds.filter((s: any) => s.type === 'test' || s.type === 'final' || !s.type);
  }, [content.sjaRounds]);

  const scenarios = finalScenarios;
  const activeScenario = scenarios[scenarioIndex] ?? scenarios[0] ?? fallbackContent.sjaRounds[0];
  const progress = scenarios.length > 0 ? ((scenarioIndex + 1) / scenarios.length) * 100 : 0;
  const timeLimitLabel = formatAssessmentMinutes(timeLimitSeconds);
  const scenarioCountLabel = `${scenarios.length} live ${scenarios.length === 1 ? 'scenario' : 'scenarios'}`;
  const timerProgress = timeLimitSeconds > 0
    ? ((timeLimitSeconds - timeRemaining) / timeLimitSeconds) * 100
    : 0;
  const timerTone = timeRemaining <= 300 ? 'text-amber-600 dark:text-amber-300' : 'text-foreground';
  const canSubmitScenario =
    timeRemaining > 0 &&
    Boolean(bestOptionId && worstOptionId && bestOptionId !== worstOptionId);
  const isTimeExpired = timeRemaining <= 0;

  const isAssessmentLive = useMemo(
    () => phase === 'scenario' || phase === 'submitting',
    [phase],
  );

  const getSjaSnapshot = useCallback(
    () => ({
      scenarioIndex,
      responses,
      timeRemaining,
      contentVersion: sessionConfigRef.current.version ?? '1.0.0',
    }),
    [responses, scenarioIndex, timeRemaining],
  );

  const {
    statusChecked,
    isLocked,
    isReconnecting,
    isPaused,
    reconnectSecondsLeft,
    markCompleted,
  } = useAssessmentHeartbeat({
    assessmentSlug: 'situational-judgement',
    candidateSessionDocumentId,
    contentVersion: content.version,
    isActive: isAssessmentLive,
    getSnapshot: getSjaSnapshot,
    onRecovered: () => {
      window.location.reload();
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        setLoading(true);
        setError(null);
        const sessionData = await initSjaSession(candidateSessionDocumentId);
        if (cancelled) return;
        if (sessionData && sessionData.runs && sessionData.runs.length > 0) {
          const sessionLimit =
            sessionData.config?.timeLimitSeconds ?? STANDARD_ASSESSMENT_TIME_LIMIT_SECONDS;
          setContent({ version: sessionData.config?.version || '1.0.0', sjaRounds: sessionData.runs });
          sessionConfigRef.current = sessionData.config ?? {};
          setTimeLimitSeconds(sessionLimit);
          setTimeRemaining(sessionLimit);
          setLoading(false);
          return;
        } else {
          throw new Error('No assessment runs returned from the session initialization.');
        }
      } catch (err: any) {
        console.error('[SituationalJudgementTest] Failed to load SJA session from backend:', err);
        if (!cancelled) {
          setError(err.message || 'Failed to initialize session. Please check your network connection.');
          setLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [candidateSessionDocumentId]);

  const startAssessment = useCallback(() => {
    startedAtRef.current = new Date().toISOString();
    setScenarioIndex(0);
    setBestOptionId(null);
    setWorstOptionId(null);
    setResponses([]);
    setSubmitError(null);
    setTimedOut(false);
    setTimeRemaining(timeLimitSeconds);
    setPhase('scenario');
  }, [timeLimitSeconds]);

  const closeAssessment = useCallback(() => {
    closeAssessmentWindow();
  }, []);

  const submitCurrentScenario = () => {
    if (!canSubmitScenario || !bestOptionId || !worstOptionId) return;

    const nextResponses = [
      ...responses,
      {
        scenarioId: activeScenario.id,
        bestOptionId,
        worstOptionId,
      },
    ];
    setResponses(nextResponses);
    setBestOptionId(null);
    setWorstOptionId(null);

    if (scenarioIndex >= scenarios.length - 1) {
      setPhase('submitting');
      return;
    }

    setScenarioIndex((currentIndex) => currentIndex + 1);
  };

  useEffect(() => {
    if (phase !== 'scenario') return;

    if (timeRemaining <= 0 || isPaused) return;

    const timerId = window.setTimeout(() => {
      setTimeRemaining((currentValue) => Math.max(currentValue - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [isPaused, phase, timeRemaining]);

  useEffect(() => {
    if (phase !== 'scenario' || timeRemaining > 0 || timedOut) return;

    let submissionResponses = [...responsesRef.current];
    const scenario = scenarios[scenarioIndexRef.current];
    const best = bestOptionIdRef.current;
    const worst = worstOptionIdRef.current;

    if (
      scenario &&
      best &&
      worst &&
      best !== worst &&
      !submissionResponses.some((response) => response.scenarioId === scenario.id)
    ) {
      submissionResponses = [
        ...submissionResponses,
        {
          scenarioId: scenario.id,
          bestOptionId: best,
          worstOptionId: worst,
        },
      ];
    }

    if (submissionResponses.length === 0) {
      setSubmitError('Time expired before any scenarios were completed.');
      setTimedOut(true);
      setPhase('submitted');
      return;
    }

    responsesRef.current = submissionResponses;
    setResponses(submissionResponses);
    setTimedOut(true);
    setPhase('submitting');
  }, [phase, scenarios, timeRemaining, timedOut]);

  useEffect(() => {
    if (phase !== 'submitted' || submitError) return;
    void markCompleted();
  }, [markCompleted, phase, submitError]);

  useEffect(() => {
    if (phase !== 'submitting') return;

    let cancelled = false;

    const submitAssessment = async () => {
      const submissionResponses = responsesRef.current;

      try {
        const response = await fetch(getAssessmentSubmitUrl('situational-judgement'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            responses: submissionResponses,
            startedAt: startedAtRef.current ?? new Date().toISOString(),
            completedAt: new Date().toISOString(),
            candidateSessionDocumentId,
            assessmentVersion: sessionConfigRef.current.version,
            difficulty: sessionConfigRef.current.difficulty,
            questionCount: scenarios.length,
            answeredCount: submissionResponses.length,
            ...buildTimedAssessmentSubmitMeta({
              timedOut,
              expectedCount: scenarios.length,
              answeredCount: submissionResponses.length,
            }),
          }),
        });

        if (cancelled) return;

        if (response.ok || response.status === 409) {
          notifyAssessmentCompleted('situational-judgement');
          setSubmitError(null);
        } else {
          const body = await response.json().catch(() => ({}));
          setSubmitError(
            (body as { error?: string }).error ??
              'Submission failed. Please contact support.'
          );
        }
      } catch {
        if (!cancelled) setSubmitError('Network error. Please contact support.');
      } finally {
        if (!cancelled) setPhase('submitted');
      }
    };

    void submitAssessment();

    return () => {
      cancelled = true;
    };
  }, [candidateSessionDocumentId, phase, responses, scenarios.length, timedOut]);

  const renderOption = (option: ScenarioOption) => {
    const isBest = bestOptionId === option.id;
    const isWorst = worstOptionId === option.id;

    return (
      <div
        key={option.id}
        className={[
          'rounded-xl border p-4 transition',
          isBest || isWorst
            ? 'border-primary/50 bg-primary/5'
            : 'border-border bg-card dark:border-white/10 dark:bg-white/[0.03]',
        ].join(' ')}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border font-mono text-sm font-semibold text-muted-foreground dark:border-white/10">
            {option.id}
          </div>
          <p className="min-h-16 flex-1 text-sm leading-6 text-foreground">{option.text}</p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant={isBest ? 'default' : 'outline'}
            onClick={() => {
              setBestOptionId(option.id);
              if (worstOptionId === option.id) setWorstOptionId(null);
            }}
            disabled={isTimeExpired}
          >
            Most effective
          </Button>
          <Button
            type="button"
            variant={isWorst ? 'default' : 'outline'}
            onClick={() => {
              setWorstOptionId(option.id);
              if (bestOptionId === option.id) setBestOptionId(null);
            }}
            disabled={isTimeExpired}
          >
            Least effective
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 font-medium">Loading assessment...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center bg-background text-foreground">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold">Failed to load assessment</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-6 h-10 px-4">
          Retry
        </Button>
      </div>
    );
  }

  if (statusChecked && isLocked) {
    return (
      <AssessmentGameShell
        icon={ClipboardCheck}
        title="Situational Judgement Assessment"
        eyebrow="CTRL assessment"
        status="Assessment paused"
      >
        <AssessmentPausedScreen />
      </AssessmentGameShell>
    );
  }

  // Resolve current stepper phase
  const stepperStep = 
    phase === 'landing' || phase === 'rules'
      ? 'welcome'
      : 'live';

  return (
    <AssessmentGameShell
      icon={ClipboardCheck}
      title="Situational Judgement Assessment"
      eyebrow="CTRL assessment"
      status={phase === 'scenario' ? `${formatTimer(timeRemaining)} remaining` : 'Best and worst judgement'}
    >
      <AssessmentReconnectOverlay open={isReconnecting} secondsRemaining={reconnectSecondsLeft ?? undefined} />
      <div className="flex flex-col w-full">
        {/* Visual Stepper Progress */}
        {phase !== 'scenario' && phase !== 'submitting' && phase !== 'submitted' && (
          <div className="mb-6 w-full">
            <AssessmentFlowStepper currentStep={stepperStep} hasPractice={false} />
          </div>
        )}
        {phase === 'landing' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-5 flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Secure judgement exercise
          </div>
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <ClipboardCheck className="h-8 w-8" aria-hidden="true" />
          </div>
          <p className="max-w-2xl text-2xl font-semibold leading-tight tracking-normal text-foreground sm:text-3xl">
            Situational Judgement Assessment
          </p>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Read each scenario and choose the most effective and least effective response.
          </p>
          <div className="mt-6 grid w-full max-w-2xl gap-3 text-left sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <Timer className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">{timeLimitLabel}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">A visual time bar stays on screen during the live scenarios.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <Target className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">Best and worst choice</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Select one most effective and one least effective action.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <ListChecks className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">{scenarioCountLabel}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Your live judgement decisions are submitted securely.</p>
            </div>
          </div>
          <Button className="mt-8 h-12 px-7" size="lg" onClick={() => setPhase('rules')}>
            Start Assessment
            <Play className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {phase === 'rules' && (
        <div className="mx-auto flex min-h-[520px] w-full flex-col justify-center py-6">
          <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10 text-primary">
                Behavioural judgement
              </Badge>
              <h1 className="mb-4 text-3xl font-semibold leading-tight text-foreground">CTRL Situational Judgement Assessment</h1>
              <p>
                This assessment is designed to understand how you are likely to respond in workplace situations involving communication, judgement, professionalism, empathy, integrity and decision-making.
              </p>
              <p className="mt-4">
                The assessment measures behavioural judgement, not job knowledge. You are not expected to have previous experience in policing, emergency services, customer service, contact centres or any specific profession. You should respond using your own judgement and select the actions you believe would be most and least effective in each situation.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr]">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mb-3 text-lg font-semibold text-foreground">What You Will See</h2>
                <p>Each scenario contains:</p>
                <div className="mt-4 grid gap-2">
                  {['A short workplace situation', 'Four possible actions labelled A, B, C and D'].map((item) => (
                    <div key={item} className="flex items-center gap-2 rounded-lg bg-muted p-3 text-foreground dark:bg-white/5">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <ListChecks className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mb-3 text-lg font-semibold text-foreground">Your Task</h2>
                <p>For each scenario, you must select:</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-background p-3 text-center dark:border-white/10 dark:bg-white/[0.02]">
                    <p className="text-sm font-semibold text-foreground">MOST effective</p>
                    <p className="mt-1 text-xs text-muted-foreground">The strongest response.</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3 text-center dark:border-white/10 dark:bg-white/[0.02]">
                    <p className="text-sm font-semibold text-foreground">LEAST effective</p>
                    <p className="mt-1 text-xs text-muted-foreground">The weakest response.</p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p className="text-xs">
                      You cannot select the same option as both MOST effective and LEAST effective.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03] flex flex-col justify-between">
                <div>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10 text-green-600 dark:text-green-400">
                    <ListChecks className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h2 className="mb-3 text-lg font-semibold text-foreground">Interactive Demo</h2>
                  <p className="mb-4">Select one option as Most Effective and a different option as Least Effective.</p>
                </div>
                <SJTAnimationPreview />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <h2 className="mb-3 text-lg font-semibold text-foreground">How to Approach Each Scenario</h2>
              <p>When making your decisions, think about:</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  'Professional behaviour',
                  'Clear communication',
                  'Empathy and calm',
                  'Responsibility',
                  'Integrity and accuracy',
                  'Proportionate decisions',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-lg bg-muted p-3 text-foreground dark:bg-white/5">
                    <Target className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Timer className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">Practice Questions</h2>
                </div>
                <p>The assessment opens with practice guidance so you can understand the best-and-worst format before the live questions. Practice is not scored and does not affect your final result.</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-600 dark:text-green-400">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">Live Assessment Questions</h2>
                </div>
                <p>The live assessment contains {scenarios.length} scored scenarios and has a {timeLimitLabel} time limit. The time bar begins when you start the scenarios and remains visible throughout.</p>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">Step-by-Step Instructions</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  `Start the live assessment when you are ready for the ${timeLimitLabel} timer`,
                  'Read the situation carefully',
                  'Read all four actions before choosing',
                  'Choose the MOST effective action',
                  'Choose the LEAST effective action',
                  'Check that you have selected two different actions',
                  'Submit your answer and move to the next scenario',
                ].map((step, index) => (
                  <div key={step} className="rounded-lg bg-muted p-3 dark:bg-white/5">
                    <span className="font-semibold text-foreground">{index + 1}.</span> {step}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-border pt-8 dark:border-white/10 sm:flex-row">
            <Button size="lg" className="h-12" onClick={startAssessment}>
              Begin scenarios
              <Play className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
            <Button size="lg" variant="outline" className="h-12" onClick={() => setPhase('landing')}>
              Back
            </Button>
          </div>
        </div>
      )}

      {phase === 'scenario' && (
        <div className="mx-auto flex min-h-[560px] w-full flex-col justify-center py-6">
          {isTimeExpired ? (
            <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
              Time limit reached. Submitting your completed scenarios…
            </div>
          ) : null}
          <div className="mb-5 rounded-xl border border-border bg-card p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {timeLimitLabel} assessment timer
                </p>
                <p className={`mt-1 text-2xl font-semibold tabular-nums ${timerTone}`}>
                  {formatTimer(timeRemaining)}
                </p>
              </div>
              <Badge variant="outline" className={timeRemaining <= 300 ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300' : undefined}>
                {timeRemaining <= 300 ? 'Final 5 minutes' : 'Time-sensitive'}
              </Badge>
            </div>
            <Progress value={timerProgress} className="mt-4 h-2.5" />
          </div>

          <div className="mb-6 rounded-xl border border-border bg-card p-4 text-sm shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <p className="font-semibold text-foreground">Pick one MOST effective and one LEAST effective action.</p>
            <p className="mt-1 text-muted-foreground">They must be two different options.</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Scenario {scenarioIndex + 1}
                </p>
                <p className="mt-1 text-xl font-semibold text-foreground">{activeScenario.title}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{scenarioIndex + 1}/{scenarios.length}</Badge>
                <Badge variant="outline">Best + worst</Badge>
              </div>
            </div>
            <Progress value={progress} className="mt-4 h-2" />
          </div>

          <div className="mt-5 rounded-xl border border-border bg-card p-5 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Situation
            </p>
            <p className="mt-3 text-lg leading-8 text-foreground">{activeScenario.scenario}</p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {activeScenario.options.map(renderOption)}
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Select one most effective and one least effective response.
            </p>
            <Button onClick={submitCurrentScenario} disabled={!canSubmitScenario || isTimeExpired}>
              {scenarioIndex >= scenarios.length - 1 ? 'Submit assessment' : 'Next scenario'}
            </Button>
          </div>
        </div>
      )}

      {phase === 'submitting' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {timedOut ? 'Saving timed submission' : 'Final scenario complete'}
          </p>
          <p className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Submitting assessment
          </p>
          <p className="mt-4 max-w-md text-muted-foreground">
            Please keep this window open while your situational judgement assessment is saved.
          </p>
        </div>
      )}

      {phase === 'submitted' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </div>
          <p className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Assessment submitted
          </p>
          {timedOut && !submitError ? (
            <Badge
              variant="outline"
              className="mt-4 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            >
              Timeout
            </Badge>
          ) : null}
          <p className="mt-4 max-w-md text-muted-foreground">
            {submitError
              ? submitError
              : timedOut
                ? 'Time limit reached. Your completed scenarios were submitted and scored.'
                : 'Thank you. Your assessment has been submitted successfully. Please complete any remaining assessments or await further information from the Hiring Manager.'}
          </p>
          <Button variant="outline" className="mt-8 h-11 px-6" onClick={closeAssessment}>
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            Close assessment
          </Button>
        </div>
      )}
      </div>
    </AssessmentGameShell>
  );
}
