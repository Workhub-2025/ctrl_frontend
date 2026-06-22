'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Brain,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Play,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import {
  AssessmentGameShell,
  AssessmentPausedScreen,
  AssessmentReconnectOverlay,
} from '@/components/assessment/shared';
import { useAssessmentHeartbeat } from '@/hooks/use-assessment-heartbeat';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { closeAssessmentWindow, notifyAssessmentCompleted } from '@/lib/assessment-completion';
import { getAssessmentSubmitUrl } from '@/assessments/plugins/registry';
import { initStmSession } from '@/app/actions/assessment-stm.actions';
import { isAlreadyCompletedSession } from '@/lib/assessment-session-already-completed';
import { buildTimedAssessmentSubmitMeta } from '@/lib/assessment-completion-status';
import {
  STM_DISTRACTION_SECONDS,
  STM_INFORMATION_SECONDS,
  STM_RECALL_SECONDS,
} from '@/lib/assessment-catalog-defaults';

type RecallQuestion = {
  id: string;
  factKey?: string;
  type: 'short_text' | 'multiple_choice';
  prompt: string;
  options?: Array<{ id: string; label: string }>;
};

type DistractionItem = {
  id: string;
  prompt: string;
};

type MemoryRound = {
  id: string;
  information?: {
    prompt?: string;
    displaySeconds?: number;
  } | null;
  distraction?: {
    durationSeconds?: number;
    items?: DistractionItem[];
  } | null;
  recallQuestions?: RecallQuestion[];
};

type SessionConfig = {
  version?: string;
  difficulty?: string;
  informationSeconds?: number;
  distractionSeconds?: number;
  recallSeconds?: number;
  passingScore?: number;
};

type Phase = 'brief' | 'information' | 'distraction' | 'recall' | 'submitting' | 'complete';

type RecallResponse = { questionId: string; value: string };
type DistractionResponse = { itemId: string; value: string };

const formatTimer = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60).toString().padStart(2, '0');
  const remaining = (safe % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
};

export default function ShortTermMemoryTest({
  candidateSessionDocumentId,
}: {
  candidateSessionDocumentId?: string | null;
}) {
  const [phase, setPhase] = useState<Phase>('brief');
  const [round, setRound] = useState<MemoryRound | null>(null);
  const [config, setConfig] = useState<SessionConfig>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [recallResponses, setRecallResponses] = useState<RecallResponse[]>([]);
  const [distractionResponses, setDistractionResponses] = useState<DistractionResponse[]>([]);
  const [distractionIndex, setDistractionIndex] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  const startedAtRef = useRef<string | null>(null);
  const recallResponsesRef = useRef<RecallResponse[]>([]);
  const distractionResponsesRef = useRef<DistractionResponse[]>([]);
  const questionIndexRef = useRef(0);
  recallResponsesRef.current = recallResponses;
  distractionResponsesRef.current = distractionResponses;
  questionIndexRef.current = questionIndex;

  const informationSeconds = config.informationSeconds ?? STM_INFORMATION_SECONDS;
  const distractionSeconds = config.distractionSeconds ?? STM_DISTRACTION_SECONDS;
  const recallSeconds = config.recallSeconds ?? STM_RECALL_SECONDS;
  const recallQuestions = round?.recallQuestions ?? [];
  const distractionItems = round?.distraction?.items ?? [];
  const activeQuestion = recallQuestions[questionIndex];

  const isAssessmentLive = useMemo(
    () => phase === 'information' || phase === 'distraction' || phase === 'recall' || phase === 'submitting',
    [phase],
  );

  const getSnapshot = useCallback(
    () => ({
      phase,
      questionIndex,
      recallResponses,
      distractionResponses,
      phaseSecondsLeft,
      contentVersion: config.version ?? '1.0.0',
    }),
    [config.version, distractionResponses, phase, phaseSecondsLeft, questionIndex, recallResponses],
  );

  const { statusChecked, isLocked, isReconnecting, isPaused, reconnectSecondsLeft, markCompleted } =
    useAssessmentHeartbeat({
      assessmentSlug: 'short-term-memory',
      candidateSessionDocumentId,
      contentVersion: config.version,
      isActive: isAssessmentLive,
      getSnapshot,
      onRecovered: () => window.location.reload(),
    });

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        setLoading(true);
        setError(null);
        const sessionData = await initStmSession(candidateSessionDocumentId);
        if (cancelled) return;
        if (isAlreadyCompletedSession(sessionData)) {
          setPhase('complete');
          setLoading(false);
          return;
        }
        if (!sessionData?.runs?.length) {
          throw new Error('No assessment rounds returned from session initialization.');
        }
        setRound(sessionData.runs[0] as MemoryRound);
        setConfig(sessionData.config ?? {});
        setLoading(false);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to initialize session.');
          setLoading(false);
        }
      }
    }

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [candidateSessionDocumentId]);

  const submitAssessment = useCallback(
    async (options?: { timedOut?: boolean }) => {
      if (!round) return;
      setPhase('submitting');
      setSubmitError(null);

      const answeredCount = recallResponsesRef.current.filter((response) => response.value.trim()).length;
      const completionMeta = buildTimedAssessmentSubmitMeta({
        timedOut: options?.timedOut ?? timedOut,
        expectedCount: recallQuestions.length,
        answeredCount,
      });

      try {
        const response = await fetch(getAssessmentSubmitUrl('short-term-memory'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assessmentVersion: config.version ?? '1.0.0',
            difficulty: config.difficulty ?? 'Base',
            rounds: [
              {
                roundId: round.id,
                distractionResponses: distractionResponsesRef.current,
                recallResponses: recallResponsesRef.current,
              },
            ],
            startedAt: startedAtRef.current ?? new Date().toISOString(),
            completedAt: new Date().toISOString(),
            candidateSessionDocumentId,
            questionCount: recallQuestions.length,
            ...completionMeta,
          }),
        });

        if (!response.ok && response.status !== 409) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? 'Submission failed');
        }

        await markCompleted();
        notifyAssessmentCompleted('short-term-memory');
        setPhase('complete');
      } catch (err: unknown) {
        setSubmitError(err instanceof Error ? err.message : 'Submission failed');
        setPhase('recall');
      }
    },
    [
      candidateSessionDocumentId,
      config.difficulty,
      config.version,
      markCompleted,
      recallQuestions.length,
      round,
      timedOut,
    ],
  );

  const beginAssessment = useCallback(() => {
    startedAtRef.current = new Date().toISOString();
    setRecallResponses([]);
    setDistractionResponses([]);
    setQuestionIndex(0);
    setDistractionIndex(0);
    setTimedOut(false);
    setPhaseSecondsLeft(informationSeconds);
    setPhase('information');
  }, [informationSeconds]);

  useEffect(() => {
    if (!['information', 'distraction', 'recall'].includes(phase)) return;
    if (isPaused) return;

    const timer = window.setInterval(() => {
      setPhaseSecondsLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isPaused, phase]);

  useEffect(() => {
    if (phaseSecondsLeft > 0) return;

    if (phase === 'information') {
      setDistractionIndex(0);
      setPhaseSecondsLeft(distractionSeconds);
      setPhase('distraction');
      return;
    }

    if (phase === 'distraction') {
      setQuestionIndex(0);
      setPhaseSecondsLeft(recallSeconds);
      setPhase('recall');
      return;
    }

    if (phase === 'recall') {
      setTimedOut(true);
      void submitAssessment({ timedOut: true });
    }
  }, [distractionSeconds, phase, phaseSecondsLeft, recallSeconds, submitAssessment]);

  const saveRecallAnswer = useCallback((value: string) => {
    if (!activeQuestion) return;
    setRecallResponses((prev) => {
      const next = prev.filter((item) => item.questionId !== activeQuestion.id);
      return [...next, { questionId: activeQuestion.id, value }];
    });
  }, [activeQuestion]);

  const currentRecallValue =
    recallResponses.find((item) => item.questionId === activeQuestion?.id)?.value ?? '';

  const advanceRecall = useCallback(() => {
    if (!activeQuestion) return;
    if (questionIndex < recallQuestions.length - 1) {
      setQuestionIndex((prev) => prev + 1);
      return;
    }
    void submitAssessment();
  }, [activeQuestion, questionIndex, recallQuestions.length, submitAssessment]);

  const saveDistractionAnswer = useCallback((value: string) => {
    const item = distractionItems[distractionIndex];
    if (!item) return;
    setDistractionResponses((prev) => {
      const next = prev.filter((entry) => entry.itemId !== item.id);
      return [...next, { itemId: item.id, value }];
    });
    if (distractionIndex < distractionItems.length - 1) {
      setDistractionIndex((prev) => prev + 1);
    }
  }, [distractionIndex, distractionItems]);

  if (loading || !statusChecked) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (statusChecked && isLocked) {
    return (
      <AssessmentGameShell
        icon={Brain}
        title="Short-Term Memory Test"
        eyebrow="CTRL assessment"
        status="Assessment paused"
      >
        <AssessmentPausedScreen />
      </AssessmentGameShell>
    );
  }

  if (!round) return null;

  const phaseLabel =
    phase === 'information'
      ? 'Study briefing'
      : phase === 'distraction'
        ? 'Distraction task'
        : phase === 'recall' || phase === 'submitting'
          ? 'Recall questions'
          : phase === 'complete'
            ? 'Submitted'
            : 'Overview';

  return (
    <AssessmentGameShell
      title="Short-Term Memory Test"
      icon={Brain}
      eyebrow="CTRL assessment"
      status={phase !== 'brief' && phase !== 'complete' ? phaseLabel : undefined}
    >
      {isReconnecting ? (
        <AssessmentReconnectOverlay
          open={isReconnecting}
          secondsRemaining={reconnectSecondsLeft ?? undefined}
        />
      ) : null}
      {isPaused ? <AssessmentPausedScreen /> : null}

      <div className="mx-auto w-full max-w-3xl space-y-6">
        {phase !== 'brief' && phase !== 'complete' ? (
          <div className="flex flex-wrap gap-2">
            {(['information', 'distraction', 'recall'] as const).map((step) => (
              <Badge
                key={step}
                variant={phase === step || (phase === 'submitting' && step === 'recall') ? 'default' : 'outline'}
              >
                {step}
              </Badge>
            ))}
          </div>
        ) : null}

        {phase === 'brief' ? (
          <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="space-y-2">
              <Badge variant="outline" className="uppercase tracking-wide">Premium assessment</Badge>
              <h2 className="text-2xl font-semibold">Short-Term Memory Test</h2>
              <p className="text-sm text-muted-foreground">
                You will review operational information, complete a brief distraction task, then
                answer recall questions from memory. You cannot return to earlier phases once you
                continue.
              </p>
            </div>
            <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <li className="rounded-lg border border-border/60 p-3">
                <p className="font-medium text-foreground">1. Information</p>
                <p>{informationSeconds}s to study the briefing.</p>
              </li>
              <li className="rounded-lg border border-border/60 p-3">
                <p className="font-medium text-foreground">2. Distraction</p>
                <p>{distractionSeconds}s of unrelated tasks.</p>
              </li>
              <li className="rounded-lg border border-border/60 p-3">
                <p className="font-medium text-foreground">3. Recall</p>
                <p>{recallSeconds}s to answer {recallQuestions.length} questions.</p>
              </li>
            </ul>
            <Button onClick={beginAssessment} disabled={isLocked} className="gap-2">
              <Play className="h-4 w-4" />
              Begin assessment
            </Button>
          </div>
        ) : null}

        {phase === 'information' ? (
          <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ClipboardList className="h-4 w-4 text-primary" />
                Study the briefing
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Timer className="h-4 w-4" />
                {formatTimer(phaseSecondsLeft)}
              </div>
            </div>
            <Progress value={((informationSeconds - phaseSecondsLeft) / informationSeconds) * 100} />
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed">
              {round.information?.prompt}
            </div>
            <p className="text-xs text-muted-foreground">
              This screen will advance automatically when the timer ends.
            </p>
          </div>
        ) : null}

        {phase === 'distraction' ? (
          <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Distraction task
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Timer className="h-4 w-4" />
                {formatTimer(phaseSecondsLeft)}
              </div>
            </div>
            <Progress value={((distractionSeconds - phaseSecondsLeft) / distractionSeconds) * 100} />
            {distractionItems[distractionIndex] ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Solve as many sums as you can. Item {distractionIndex + 1} of {distractionItems.length}.
                </p>
                <p className="text-2xl font-semibold">{distractionItems[distractionIndex].prompt}</p>
                <Input
                  inputMode="numeric"
                  placeholder="Your answer"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      saveDistractionAnswer((event.target as HTMLInputElement).value);
                      (event.target as HTMLInputElement).value = '';
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  onClick={(event) => {
                    const input = (event.currentTarget.parentElement?.querySelector('input') as HTMLInputElement | null);
                    if (!input) return;
                    saveDistractionAnswer(input.value);
                    input.value = '';
                  }}
                >
                  Submit answer
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Wait for the recall phase to begin.</p>
            )}
          </div>
        ) : null}

        {phase === 'recall' || phase === 'submitting' ? (
          <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Brain className="h-4 w-4 text-primary" />
                Recall questions
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Timer className="h-4 w-4" />
                {formatTimer(phaseSecondsLeft)}
              </div>
            </div>
            <Progress value={((recallSeconds - phaseSecondsLeft) / recallSeconds) * 100} />
            {activeQuestion ? (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Question {questionIndex + 1} of {recallQuestions.length}
                </p>
                <p className="text-base font-medium">{activeQuestion.prompt}</p>
                {activeQuestion.type === 'multiple_choice' && activeQuestion.options ? (
                  <RadioGroup
                    value={currentRecallValue}
                    onValueChange={saveRecallAnswer}
                    className="space-y-2"
                  >
                    {activeQuestion.options.map((option) => (
                      <div key={option.id} className="flex items-center gap-2 rounded-lg border border-border/60 p-3">
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label htmlFor={option.id}>{option.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <Input
                    value={currentRecallValue}
                    onChange={(event) => saveRecallAnswer(event.target.value)}
                    placeholder="Type your answer"
                  />
                )}
                <div className="flex gap-3">
                  <Button onClick={advanceRecall} disabled={phase === 'submitting'}>
                    {questionIndex < recallQuestions.length - 1 ? 'Next question' : 'Submit assessment'}
                  </Button>
                </div>
              </div>
            ) : null}
            {submitError ? (
              <p className="text-sm text-destructive">{submitError}</p>
            ) : null}
            {phase === 'submitting' ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting your responses…
              </div>
            ) : null}
          </div>
        ) : null}

        {phase === 'complete' ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
            <h2 className="text-xl font-semibold">Assessment submitted</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your short-term memory responses have been recorded.
            </p>
            <Button className="mt-4" onClick={() => closeAssessmentWindow(candidateSessionDocumentId)}>
              Close window
            </Button>
          </div>
        ) : null}
      </div>
    </AssessmentGameShell>
  );
}
