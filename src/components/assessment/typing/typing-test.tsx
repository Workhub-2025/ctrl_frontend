'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { CheckCircle2, Coffee, Keyboard, Loader2, Play, RotateCcw, Timer } from 'lucide-react';
import { AssessmentGameShell } from '@/components/assessment/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AssessmentProgressService } from '@/services/assessment-progress.service';
import type { TypingTestProgress } from '@/types/assessments-progress.types';

/**
 * Props for the TypingTest component.
 */
interface TypingTestProps {
  enableAutoSave?: boolean;
  /** Pre-fetched runs from Strapi. When provided, the static JSON fallback is skipped. */
  initialRuns?: Array<{ id: string; text: string }>;
}

type TypingContentFile = {
  runs: Array<{
    id: string;
    text: string;
  }>;
};

type TestPhase =
  | 'landing'
  | 'rules'
  | 'countdown'
  | 'running'
  | 'results'
  | 'submitting'
  | 'submitted';

type RunResult = {
  runIndex: number;
  duration: number;
  typedCharacters: number;
  correctCharacters: number;
  mistakeCharacters: number;
  wpm: number;
  accuracy: number;
};

const RUN_DURATIONS = [30, 30, 30, 60] as const;
const FINAL_RUN_INDEX = RUN_DURATIONS.length - 1;
const fallbackRuns: TypingContentFile['runs'] = [
  {
    id: 'fallback-typing',
    text: 'The caller gives clear information about the location, the danger, and the people involved. Type each character carefully and keep your attention on the words in front of you.',
  },
];

const calculateResult = (
  runIndex: number,
  duration: number,
  typedCharacters: string[],
  expectedText: string
): RunResult => {
  const correctCharacters = typedCharacters.reduce((total, character, index) => {
    return total + (character === expectedText[index] ? 1 : 0);
  }, 0);
  const typedCount = typedCharacters.length;
  const mistakeCharacters = Math.max(typedCount - correctCharacters, 0);
  const minutes = duration / 60;
  const wpm = Math.round(correctCharacters / 5 / minutes);
  const accuracy =
    typedCount === 0 ? 100 : Math.round((correctCharacters / typedCount) * 100);

  return {
    runIndex,
    duration,
    typedCharacters: typedCount,
    correctCharacters,
    mistakeCharacters,
    wpm,
    accuracy,
  };
};

/**
 * TypingTest Component
 * 
 * Renders the visual shell and interaction flow for the typing assessment.
 * Submission and final scoring are deliberately deferred until the backend
 * contract is agreed.
 * 
 * @param {TypingTestProps} props - Component properties including auto-save toggles.
 */
export default function TypingTest({ enableAutoSave = false, initialRuns }: Readonly<TypingTestProps>) {
  const [phase, setPhase] = useState<TestPhase>('landing');
  const [runs, setRuns] = useState<TypingContentFile['runs']>(
    initialRuns && initialRuns.length > 0 ? initialRuns : fallbackRuns
  );
  const [currentRunIndex, setCurrentRunIndex] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState<number>(RUN_DURATIONS[0]);
  const [typedCharacters, setTypedCharacters] = useState<string[]>([]);
  const [results, setResults] = useState<RunResult[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const captureRef = useRef<HTMLTextAreaElement | null>(null);
  const typedCharactersRef = useRef<string[]>([]);
  const runIndexRef = useRef(0);
  const currentTextRef = useRef(fallbackRuns[0].text);
  const finishRunRef = useRef<() => void>(() => {});
  const startedAtRef = useRef<string | null>(null);
  // Ref used by the periodic auto-save interval (avoids stale closure over results state)
  const latestResultRef = useRef<RunResult | null>(null);

  const currentText = useMemo(() => {
    return runs[currentRunIndex]?.text ?? fallbackRuns[0].text;
  }, [currentRunIndex, runs]);

  const currentDuration = RUN_DURATIONS[currentRunIndex] ?? RUN_DURATIONS[0];
  const isFinalRun = currentRunIndex === FINAL_RUN_INDEX;
  const runLabel = isFinalRun
    ? 'Final run'
    : `Practice run ${currentRunIndex + 1} of ${FINAL_RUN_INDEX}`;

  const latestResult = results[results.length - 1];
  const nextRunIndex = latestResult ? latestResult.runIndex + 1 : 0;
  const nextRunIsFinal = nextRunIndex === FINAL_RUN_INDEX;

  useEffect(() => {
    typedCharactersRef.current = typedCharacters;
  }, [typedCharacters]);

  useEffect(() => {
    runIndexRef.current = currentRunIndex;
  }, [currentRunIndex]);

  useEffect(() => {
    currentTextRef.current = currentText;
  }, [currentText]);

  // Keep latestResultRef in sync so the auto-save interval always has the current value
  useEffect(() => {
    latestResultRef.current = results.at(-1) ?? null;
  }, [results]);

  // Auto-save after each completed run (results array grows by one element)
  useEffect(() => {
    if (!enableAutoSave || results.length === 0) return;
    const latest = results.at(-1)!;
    const progress: TypingTestProgress = {
      testType: 'typing',
      currentIndex: latest.runIndex,
      results: { wpm: latest.wpm, accuracy: latest.accuracy },
      status: 'in-progress',
    };
    void AssessmentProgressService.saveProgress(progress);
  }, [enableAutoSave, results]);

  // Clear saved progress once the assessment is fully submitted
  useEffect(() => {
    if (phase !== 'submitted') return;
    void AssessmentProgressService.clearProgress('typing');
  }, [phase]);

  const resetTypedState = useCallback((runIndex: number) => {
    setTypedCharacters([]);
    setTimeLeft(RUN_DURATIONS[runIndex] ?? RUN_DURATIONS[0]);
  }, []);

  const beginCountdown = useCallback(
    (runIndex: number) => {
      if (runIndex === 0) {
        startedAtRef.current = new Date().toISOString();
      }
      setCurrentRunIndex(runIndex);
      resetTypedState(runIndex);
      setCountdown(3);
      setPhase('countdown');
    },
    [resetTypedState]
  );

  const finishRun = useCallback(() => {
    const activeRunIndex = runIndexRef.current;
    const activeDuration = RUN_DURATIONS[activeRunIndex] ?? RUN_DURATIONS[0];
    const result = calculateResult(
      activeRunIndex,
      activeDuration,
      typedCharactersRef.current,
      currentTextRef.current
    );

    setResults((previousResults) => [...previousResults, result]);

    if (activeRunIndex === FINAL_RUN_INDEX) {
      setPhase('submitting');
      return;
    }

    setPhase('results');
  }, []);

  useEffect(() => {
    finishRunRef.current = finishRun;
  }, [finishRun]);

  const restartAssessment = useCallback(() => {
    setCurrentRunIndex(0);
    setResults([]);
    resetTypedState(0);
    setPhase('landing');
  }, [resetTypedState]);

  // Sync runs if the parent provides updated initialRuns after mount
  useEffect(() => {
    if (initialRuns && initialRuns.length > 0) {
      setRuns(initialRuns);
    }
  }, [initialRuns]);

  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdown === 0) {
      setPhase('running');
      return;
    }

    const timerId = window.setTimeout(() => {
      setCountdown((currentValue) => currentValue - 1);
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [countdown, phase]);

  useEffect(() => {
    if (phase !== 'running') return;

    captureRef.current?.focus();
    const duration = RUN_DURATIONS[runIndexRef.current] ?? RUN_DURATIONS[0];
    const endTime = Date.now() + duration * 1000;

    const timerId = globalThis.setInterval(() => {
      const nextTimeLeft = Math.max(Math.ceil((endTime - Date.now()) / 1000), 0);
      setTimeLeft(nextTimeLeft);

      if (nextTimeLeft === 0) {
        globalThis.clearInterval(timerId);
        finishRunRef.current();
      }
    }, 250);

    // Periodic auto-save every 15 s during a running phase
    let autoSaveIntervalId: ReturnType<typeof globalThis.setInterval> | undefined;
    if (enableAutoSave) {
      autoSaveIntervalId = globalThis.setInterval(() => {
        const latest = latestResultRef.current;
        const progress: TypingTestProgress = {
          testType: 'typing',
          currentIndex: runIndexRef.current,
          results: latest ? { wpm: latest.wpm, accuracy: latest.accuracy } : null,
          timeLeft: Math.max(Math.ceil((endTime - Date.now()) / 1000), 0),
          status: 'in-progress',
        };
        void AssessmentProgressService.saveProgress(progress);
      }, 15_000);
    }

    return () => {
      globalThis.clearInterval(timerId);
      if (autoSaveIntervalId !== undefined) globalThis.clearInterval(autoSaveIntervalId);
    };
  }, [phase, enableAutoSave]);

  useEffect(() => {
    if (phase !== 'submitting') return;

    let cancelled = false;

    const submit = async () => {
      try {
        const response = await fetch('/api/assessment/typing/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runs: results,
            startedAt: startedAtRef.current ?? new Date().toISOString(),
            completedAt: new Date().toISOString(),
          }),
        });

        if (!cancelled) {
          if (!response.ok) {
            // 409 = already submitted (idempotency guard) — treat as success
            // so the candidate sees the normal completion screen
            if (response.status !== 409) {
              const body = await response.json().catch(() => ({}));
              setSubmitError(
                (body as { error?: string }).error ??
                  'Submission failed. Please contact support.'
              );
            }
          }
          setPhase('submitted');
        }
      } catch {
        if (!cancelled) {
          setSubmitError('Network error. Please contact support.');
          setPhase('submitted');
        }
      }
    };

    void submit();

    return () => {
      cancelled = true;
    };
  }, [phase, results]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (phase !== 'running') return;

    if (event.key === 'Backspace') {
      event.preventDefault();
      setTypedCharacters((previousCharacters) => previousCharacters.slice(0, -1));
      return;
    }

    if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    event.preventDefault();
    setTypedCharacters((previousCharacters) => {
      if (previousCharacters.length >= currentText.length) {
        return previousCharacters;
      }

      return [...previousCharacters, event.key];
    });
  };

  const typedCount = typedCharacters.length;
  const liveCorrectCount = typedCharacters.reduce((total, character, index) => {
    return total + (character === currentText[index] ? 1 : 0);
  }, 0);
  const liveMistakeCount = Math.max(typedCount - liveCorrectCount, 0);
  const progressValue = ((currentDuration - timeLeft) / currentDuration) * 100;

  return (
    <AssessmentGameShell
      icon={Keyboard}
      title="Typing Speed & Accuracy"
      eyebrow="CTRL assessment"
      status={phase === 'running' ? `${timeLeft}s remaining` : runLabel}
    >
      {phase === 'landing' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Keyboard className="h-8 w-8" />
          </div>
          <p className="max-w-2xl text-2xl font-semibold leading-tight tracking-normal text-foreground sm:text-3xl">
            Typing Test
          </p>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Complete a timed typing assessment in a focused, secure display.
            You will be shown the instructions before the first run begins.
          </p>
          <Button
            className="mt-8 h-12 px-7"
            size="lg"
            onClick={() => setPhase('rules')}
          >
            Start Assessment
            <Play className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {phase === 'rules' && (
        <div className="mx-auto flex min-h-[520px] w-full max-w-3xl flex-col justify-center">
          <Badge className="mb-5 w-fit" variant="secondary">
            How this test works
          </Badge>
          <p className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            You will complete four timed typing runs.
          </p>
          <div className="mt-6 grid gap-3 text-sm leading-6 text-muted-foreground sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Practice runs</p>
              <p className="mt-1">Three runs lasting 30 seconds each.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Final run</p>
              <p className="mt-1">One final run lasting 1 minute.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Typing display</p>
              <p className="mt-1">Correct characters turn blue. Mistakes turn red.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Corrections</p>
              <p className="mt-1">Backspace is allowed and corrections are tracked.</p>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-12" onClick={() => beginCountdown(0)}>
              Start Test Assessment
              <Play className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12"
              onClick={() => setPhase('landing')}
            >
              Back
            </Button>
          </div>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="relative flex min-h-[520px] w-full items-center justify-center overflow-hidden rounded-2xl bg-primary/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.16),transparent_58%)]" />
          <div className="relative max-w-xl px-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              {isFinalRun ? 'Final typing test' : runLabel}
            </p>
            {isFinalRun && (
              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                This is the full 1 minute run. Your final result will be submitted
                without showing a score on screen.
              </p>
            )}
            <p className="mt-7 text-7xl font-semibold tabular-nums text-foreground sm:text-8xl">
              {countdown}
            </p>
          </div>
        </div>
      )}

      {phase === 'running' && (
        <div className="mx-auto flex min-h-[520px] w-full max-w-5xl flex-col justify-center">
          <textarea
            ref={captureRef}
            aria-label="Typing capture area"
            className="sr-only"
            onBlur={() => captureRef.current?.focus()}
            onKeyDown={handleKeyDown}
            value=""
            readOnly
          />

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {runLabel}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                {timeLeft}s
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-xl border border-border px-3 py-2 dark:border-white/10">
                <p className="text-muted-foreground">Typed</p>
                <p className="mt-1 font-mono text-base text-foreground">{typedCount}</p>
              </div>
              <div className="rounded-xl border border-border px-3 py-2 dark:border-white/10">
                <p className="text-muted-foreground">Correct</p>
                <p className="mt-1 font-mono text-base text-blue-600 dark:text-blue-400">
                  {liveCorrectCount}
                </p>
              </div>
              <div className="rounded-xl border border-border px-3 py-2 dark:border-white/10">
                <p className="text-muted-foreground">Mistakes</p>
                <p className="mt-1 font-mono text-base text-red-600 dark:text-red-400">
                  {liveMistakeCount}
                </p>
              </div>
            </div>
          </div>

          <Progress value={progressValue} className="mb-5 h-2" />

          <button
            type="button"
            className="min-h-[260px] w-full cursor-text overflow-hidden rounded-xl border border-border bg-card p-5 text-left shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary dark:border-white/10 dark:bg-white/[0.03] sm:p-6"
            onClick={() => captureRef.current?.focus()}
          >
            <span className="break-words font-mono text-base leading-8 text-muted-foreground sm:text-lg sm:leading-9">
              {currentText.split('').map((character, index) => {
                const typedCharacter = typedCharacters[index];
                const hasBeenTyped = typedCharacter !== undefined;
                const isCurrentCharacter = index === typedCharacters.length;
                const isCorrect = typedCharacter === character;

                return (
                  <span
                    key={`${character}-${index}`}
                    className={[
                      hasBeenTyped && isCorrect
                        ? 'text-blue-600 dark:text-blue-400'
                        : '',
                      hasBeenTyped && !isCorrect
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                        : '',
                      isCurrentCharacter
                        ? 'rounded-sm border-b-2 border-primary text-foreground'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {character}
                  </span>
                );
              })}
            </span>
          </button>
        </div>
      )}

      {phase === 'results' && latestResult && (
        <div className="mx-auto flex min-h-[520px] w-full max-w-3xl flex-col justify-center text-center">
          {nextRunIsFinal ? (
            <>
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Timer className="h-7 w-7" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Test typing complete
              </p>
              <p className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                That is the end of the test typing
              </p>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Take a break before pressing continue. When you are ready, the
                next countdown will start the real 1 minute typing assessment.
              </p>
              <div className="mx-auto mt-7 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="font-medium text-foreground">Stay steady</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Accuracy matters. Do not rush so much that errors build up.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="font-medium text-foreground">Corrections</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    You can backspace to fix mistakes during the run.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="font-medium text-foreground">Final run</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Your final score will not be shown after submission.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Coffee className="h-7 w-7" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Practice run {latestResult.runIndex + 1} complete
              </p>
              <p className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                Take a moment if you need it
              </p>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                The next practice run will begin as soon as you continue and the
                short countdown completes. Rest your hands now if you need a
                break.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border p-4 dark:border-white/10">
                  <p className="text-sm text-muted-foreground">WPM</p>
                  <p className="mt-2 font-mono text-2xl font-semibold">{latestResult.wpm}</p>
                </div>
                <div className="rounded-xl border border-border p-4 dark:border-white/10">
                  <p className="text-sm text-muted-foreground">Accuracy</p>
                  <p className="mt-2 font-mono text-2xl font-semibold">
                    {latestResult.accuracy}%
                  </p>
                </div>
                <div className="rounded-xl border border-border p-4 dark:border-white/10">
                  <p className="text-sm text-muted-foreground">Mistakes</p>
                  <p className="mt-2 font-mono text-2xl font-semibold">
                    {latestResult.mistakeCharacters}
                  </p>
                </div>
              </div>
            </>
          )}
          <Button
            size="lg"
            className="mx-auto mt-8 h-12 px-8"
            onClick={() => beginCountdown(currentRunIndex + 1)}
          >
            {nextRunIsFinal ? 'Start final countdown' : 'Continue to next run'}
          </Button>
        </div>
      )}

      {phase === 'submitting' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Final run complete
          </p>
          <p className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Submitting assessment
          </p>
          <p className="mt-4 max-w-md text-muted-foreground">
            Please keep this window open while your assessment is prepared for
            submission.
          </p>
        </div>
      )}

      {phase === 'submitted' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-3xl ${submitError ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600 dark:text-green-400'}`}>
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Assessment submitted
          </p>
          {submitError ? (
            <p className="mt-4 max-w-md text-sm text-destructive">
              {submitError}
            </p>
          ) : (
            <p className="mt-4 max-w-md text-muted-foreground">
              Your typing assessment has been completed. No final score is shown
              on this screen.
            </p>
          )}
          <Button
            variant="outline"
            className="mt-8 h-11 px-6"
            onClick={restartAssessment}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset visual demo
          </Button>
        </div>
      )}
    </AssessmentGameShell>
  );
}
