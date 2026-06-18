'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTypingSessionStore } from '@/store/typing-session.store';
import {
  AlertTriangle,
  CheckCircle2,
  Coffee,
  FileText,
  Keyboard,
  Loader2,
  LogOut,
  Play,
  RotateCcw,
  ShieldCheck,
  Target,
  Timer,
} from 'lucide-react';
import { AssessmentGameShell, AssessmentFlowStepper, AssessmentReconnectOverlay, AssessmentPausedScreen } from '@/components/assessment/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AssessmentProgressService } from '@/services/assessment-progress.service';
import type { TypingTestProgress } from '@/types/assessments-progress.types';
import { closeAssessmentWindow, notifyAssessmentCompleted } from '@/lib/assessment-completion';
import { useAssessmentHeartbeat } from '@/hooks/use-assessment-heartbeat';
import { AssessmentAttemptService, type CandidateAssessmentAttempt } from '@/services/assessment-attempt.service';
import { getAssessmentSubmitUrl } from '@/assessments/plugins/registry';
import { cn } from '@/lib/utils';

const typingSequence = [
  { text: "", errorIndex: -1 },
  { text: "T", errorIndex: -1 },
  { text: "Th", errorIndex: -1 },
  { text: "The", errorIndex: -1 },
  { text: "The ", errorIndex: -1 },
  { text: "The c", errorIndex: -1 },
  { text: "The ca", errorIndex: -1 },
  { text: "The cal", errorIndex: -1 },
  { text: "The call", errorIndex: -1 },
  { text: "The calle", errorIndex: -1 },
  { text: "The caller", errorIndex: -1 },
  { text: "The caller ", errorIndex: -1 },
  { text: "The caller r", errorIndex: -1 },
  { text: "The caller re", errorIndex: -1 },
  { text: "The caller rep", errorIndex: -1 },
  { text: "The caller repo", errorIndex: -1 },
  { text: "The caller repor", errorIndex: -1 },
  { text: "The caller report", errorIndex: -1 },
  { text: "The caller reporte", errorIndex: -1 },
  { text: "The caller reported", errorIndex: -1 },
  { text: "The caller reported ", errorIndex: -1 },
  { text: "The caller reported a", errorIndex: -1 },
  { text: "The caller reported a ", errorIndex: -1 },
  { text: "The caller reported a v", errorIndex: -1 },
  { text: "The caller reported a ve", errorIndex: -1 },
  { text: "The caller reported a veh", errorIndex: -1 },
  { text: "The caller reported a vehi", errorIndex: -1 },
  { text: "The caller reported a vehic", errorIndex: -1 },
  { text: "The caller reported a vehicx", errorIndex: 28 }, // Error types x
  { text: "The caller reported a vehicxy", errorIndex: 28 }, // Error types y
  { text: "The caller reported a vehicx", errorIndex: 28 }, // Backspace 1
  { text: "The caller reported a vehic", errorIndex: -1 }, // Backspace 2 (Corrected!)
  { text: "The caller reported a vehicl", errorIndex: -1 },
  { text: "The caller reported a vehicle", errorIndex: -1 },
  { text: "The caller reported a vehicle ", errorIndex: -1 },
  { text: "The caller reported a vehicle c", errorIndex: -1 },
  { text: "The caller reported a vehicle co", errorIndex: -1 },
  { text: "The caller reported a vehicle col", errorIndex: -1 },
  { text: "The caller reported a vehicle coll", errorIndex: -1 },
  { text: "The caller reported a vehicle colli", errorIndex: -1 },
  { text: "The caller reported a vehicle collis", errorIndex: -1 },
  { text: "The caller reported a vehicle collisi", errorIndex: -1 },
  { text: "The caller reported a vehicle collisio", errorIndex: -1 },
  { text: "The caller reported a vehicle collision", errorIndex: -1 },
  { text: "The caller reported a vehicle collision.", errorIndex: -1, isComplete: true },
];

function TypingAnimationPreview() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % typingSequence.length);
    }, 200);
    return () => clearInterval(timer);
  }, []);

  const current = typingSequence[index];
  const targetText = "The caller reported a vehicle collision.";
  
  return (
    <div className="w-full rounded-xl border border-border bg-muted/40 p-4 font-mono shadow-inner dark:bg-black/20">
      <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-2 text-xs text-muted-foreground">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Typing Walkthrough</span>
      </div>
      
      <div className="space-y-3 text-xs leading-relaxed">
        <div>
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-primary block mb-1">Text to Type:</span>
          <div className="rounded bg-background p-2.5 text-foreground border border-border/50 dark:bg-zinc-900/60 select-none">
            {targetText}
          </div>
        </div>
        
        <div>
          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400 block mb-1">Your Typing Input:</span>
          <div className="relative rounded bg-background p-2.5 text-foreground border border-border/50 min-h-[3rem] dark:bg-zinc-900/80 select-none">
            {targetText.split("").map((char, charIdx) => {
              let className = "text-muted-foreground/30";
              if (charIdx < current.text.length) {
                if (current.errorIndex !== -1 && charIdx >= current.errorIndex) {
                  className = "text-red-500 bg-red-500/10 font-bold underline decoration-wavy";
                } else {
                  className = "text-green-600 dark:text-green-400 font-medium";
                }
              }
              return (
                <span key={charIdx} className={cn(className, "transition-colors duration-75")}>
                  {current.text[charIdx] || char}
                </span>
              );
            })}
            <span className="w-1.5 h-4 bg-primary inline-block absolute animate-pulse ml-0.5 top-[13px]" />
            
            {current.isComplete && (
              <span className="absolute right-2 top-2 inline-flex items-center text-[9px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider animate-bounce bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                Corrected!
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


/**
 * Props for the TypingTest component.
 */
interface TypingTestProps {
  enableAutoSave?: boolean;
  candidateSessionDocumentId?: string | null;
  onIntegrityMonitoringChange?: (active: boolean) => void;
}

type TypingContentFile = {
  version: string;
  taRounds: Array<{
    id: string;
    text: string;
    type?: 'practice' | 'test';
    difficulty?: string;
  }>;
};

type TestPhase =
  | 'landing'
  | 'rules'
  | 'countdown'
  | 'running'
  | 'results'
  | 'assessment-break'
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

const fallbackRuns: TypingContentFile['taRounds'] = [
  {
    id: 'fallback-practice-base',
    type: 'practice',
    difficulty: 'Base',
    text: 'The caller gives clear information about the location, the danger, and the people involved. Type each character carefully and keep your attention on the words in front of you.',
  },
  {
    id: 'fallback-test-base-1',
    type: 'test',
    difficulty: 'Base',
    text: 'A caller reports a disturbance outside a shop on Market Street. Two people are arguing loudly near the entrance. One person has knocked over a display stand and customers are moving away from the area.',
  },
  {
    id: 'fallback-test-base-2',
    type: 'test',
    difficulty: 'Base',
    text: 'A resident reports a vehicle blocking the entrance to a small car park. The driver is not nearby and delivery vehicles are unable to enter. The caller says traffic is starting to build on the road.',
  },
  {
    id: 'fallback-test-base-3',
    type: 'test',
    difficulty: 'Base',
    text: 'A caller reports a lost child near the main bus station. The child appears upset and cannot give a full address. A member of staff is staying with the child until support arrives.',
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

const getLines = (text: string, charsPerLine: number = 72) => {
  const lines: { text: string; startIndex: number; endIndex: number }[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const newlineIndex = text.indexOf('\n', startIndex);
    const maxEndIndex = Math.min(startIndex + charsPerLine, text.length);
    let endIndex = maxEndIndex;

    if (newlineIndex !== -1 && newlineIndex < maxEndIndex) {
      endIndex = newlineIndex + 1;
    } else if (maxEndIndex < text.length) {
      const slice = text.slice(startIndex, maxEndIndex);
      const lastWhitespaceIndex = Math.max(
        slice.lastIndexOf(' '),
        slice.lastIndexOf('\t')
      );

      if (lastWhitespaceIndex > 0) {
        endIndex = startIndex + lastWhitespaceIndex + 1;
      }
    }

    lines.push({
      text: text.slice(startIndex, endIndex),
      startIndex,
      endIndex,
    });

    startIndex = endIndex;
  }

  return lines;
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
export default function TypingTest({
  enableAutoSave = false,
  candidateSessionDocumentId,
  onIntegrityMonitoringChange,
}: Readonly<TypingTestProps>) {
  const router = useRouter();
  const storeRuns = useTypingSessionStore((s) => s.runs);
  const sessionId = useTypingSessionStore((s) => s.sessionId);
  const assessmentId = useTypingSessionStore((s) => s.assessmentId);
  const config = useTypingSessionStore((s) => s.config);
  const setSubmissionStatus = useTypingSessionStore((s) => s.setSubmissionStatus);
  const clearSession = useTypingSessionStore((s) => s.clearSession);

  // Refs for stable closure access (config/sessionId are set once per session)
  const configRef = useRef(config);
  const sessionIdRef = useRef(sessionId);
  const assessmentIdRef = useRef(assessmentId);

  const [phase, setPhase] = useState<TestPhase>('landing');
  const [runs, setRuns] = useState<TypingContentFile['taRounds']>(storeRuns);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (phase === 'submitting' || phase === 'submitted') {
        setLoading(false);
        return;
      }

      if (storeRuns.length === 0) {
        setError("Failed to load typing runs from backend.");
      } else {
        setRuns(storeRuns);
        setError(null);
      }
      setLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [phase, storeRuns]);

  const [currentRunIndex, setCurrentRunIndex] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState<number>(config.timeLimitPerRound);
  const [runStarted, setRunStarted] = useState(false);
  const [typedCharacters, setTypedCharacters] = useState<string[]>([]);
  const [results, setResults] = useState<RunResult[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const captureRef = useRef<HTMLTextAreaElement | null>(null);
  const typedCharactersRef = useRef<string[]>([]);
  const runIndexRef = useRef(0);
  const currentTextRef = useRef(runs[0]?.text ?? '');
  const finishRunRef = useRef<() => void>(() => {});
  const startedAtRef = useRef<string | null>(null);
  // Ref used by the periodic auto-save interval (avoids stale closure over results state)
  const latestResultRef = useRef<RunResult | null>(null);
  const resumeAppliedRef = useRef(false);

  const isAssessmentLive = useMemo(() => {
    if (currentRunIndex < 1) return false;
    return phase === 'countdown' || phase === 'running' || phase === 'assessment-break' || phase === 'submitting';
  }, [currentRunIndex, phase]);

  const getTypingSnapshot = useCallback(() => {
    const completedRuns = results.filter((result) => result.runIndex >= 1);
    return {
      completedRuns,
      completedRunIndexes: completedRuns.map((result) => result.runIndex),
      currentRunIndex,
      currentRunStarted: runStarted,
      contentVersion: configRef.current?.version ?? '1.0.0',
    };
  }, [currentRunIndex, results, runStarted]);

  const applyTypingRecovery = useCallback(
    (attempt: CandidateAssessmentAttempt) => {
      if (resumeAppliedRef.current) return;
      resumeAppliedRef.current = true;

      if (attempt.recoveryMode === 'restart') {
        clearSession();
        window.location.reload();
        return;
      }

      if (attempt.recoveryMode !== 'resume') return;

      const snapshot = attempt.snapshot as {
        completedRuns?: RunResult[];
        currentRunIndex?: number;
      } | null;

      const completedRuns = Array.isArray(snapshot?.completedRuns)
        ? snapshot.completedRuns
        : [];

      if (completedRuns.length > 0) {
        setResults(completedRuns);
      }

      const resumeRunIndex =
        typeof snapshot?.currentRunIndex === 'number'
          ? snapshot.currentRunIndex
          : completedRuns.length > 0
            ? Math.max(...completedRuns.map((result) => result.runIndex)) + 1
            : 1;

      setCurrentRunIndex(resumeRunIndex);
      setTypedCharacters([]);
      setTimeLeft(configRef.current.timeLimitPerRound);
      setRunStarted(false);
      setCountdown(3);
      setPhase('countdown');
      startedAtRef.current = attempt.startedAt ?? new Date().toISOString();
    },
    [clearSession],
  );

  const {
    statusChecked,
    isLocked,
    isReconnecting,
    isPaused,
    reconnectSecondsLeft,
    markCompleted,
  } = useAssessmentHeartbeat({
    assessmentSlug: 'typing',
    candidateSessionDocumentId,
    contentVersion: config.version,
    isActive: isAssessmentLive,
    getSnapshot: getTypingSnapshot,
    onRecovered: applyTypingRecovery,
  });

  useEffect(() => {
    if (!candidateSessionDocumentId || !statusChecked || isLocked || resumeAppliedRef.current) {
      return;
    }
    if (phase !== 'landing' && phase !== 'rules') return;

    void AssessmentAttemptService.getStatus(candidateSessionDocumentId, 'typing').then((attempt) => {
      if (
        attempt?.attemptStatus === 'in_progress'
        && attempt.recoveryMode === 'resume'
      ) {
        applyTypingRecovery(attempt);
      }
    });
  }, [
    applyTypingRecovery,
    candidateSessionDocumentId,
    isLocked,
    phase,
    statusChecked,
  ]);

  // Keep config and sessionId refs in sync so closures always have current values
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { assessmentIdRef.current = assessmentId; }, [assessmentId]);

  const currentText = useMemo(() => {
    return runs[currentRunIndex]?.text ?? '';
  }, [currentRunIndex, runs]);

  // Run index 0 is practice. Live assessment runs are 1..roundCount.
  const finalRunIndex = config.roundCount;
  const isPracticeRun = currentRunIndex === 0;
  const currentDuration = config.timeLimitPerRound;
  const isLastAssessmentRun = currentRunIndex === finalRunIndex;
  const assessmentRunNumber = Math.max(currentRunIndex, 1);
  const selectedDifficulty = config.difficulty ?? 'Base';
  const liveExerciseLabel =
    finalRunIndex === 1 ? 'one typing exercise' : `${finalRunIndex} typing exercises`;
  const runLabel = isPracticeRun
    ? 'Practice run'
    : `Assessment run ${assessmentRunNumber} of ${finalRunIndex}`;

  const latestResult = results[results.length - 1];
  const nextRunIndex = latestResult ? latestResult.runIndex + 1 : 0;
  const nextRunIsFirstAssessment = nextRunIndex === 1;
  const integrityMonitoringActive =
    currentRunIndex > 0 &&
    (phase === 'countdown' ||
      phase === 'running' ||
      phase === 'assessment-break' ||
      phase === 'submitting');

  useEffect(() => {
    onIntegrityMonitoringChange?.(integrityMonitoringActive);
  }, [integrityMonitoringActive, onIntegrityMonitoringChange]);

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
    void AssessmentProgressService.saveProgress(
      progress,
      sessionIdRef.current,
      candidateSessionDocumentId
    );
  }, [candidateSessionDocumentId, enableAutoSave, results]);

  // Clear saved progress once the assessment is fully submitted. Keep the
  // hydrated typing session in memory until the user closes the confirmation
  // screen, otherwise the loader effect can replace the submitted screen with
  // a false "Failed to load assessment" error.
  useEffect(() => {
    if (phase !== 'submitted') return;
    void AssessmentProgressService.clearProgress('typing', candidateSessionDocumentId);
  }, [candidateSessionDocumentId, phase]);

  const resetTypedState = useCallback((_runIndex: number) => {
    setTypedCharacters([]);
    setTimeLeft(configRef.current.timeLimitPerRound);
    setRunStarted(false);
  }, []);

  const beginCountdown = useCallback(
    (runIndex: number) => {
      if (runIndex === 0) {
        startedAtRef.current = new Date().toISOString();
      }
      setCurrentRunIndex(runIndex);
      resetTypedState(runIndex);
      setCountdown(0);
      setPhase('running');
    },
    [resetTypedState]
  );

  const finishRun = useCallback(() => {
    const activeRunIndex = runIndexRef.current;
    const activeDuration = configRef.current.timeLimitPerRound;
    const result = calculateResult(
      activeRunIndex,
      activeDuration,
      typedCharactersRef.current,
      currentTextRef.current
    );

    setResults((previousResults) => [...previousResults, result]);

    if (activeRunIndex === configRef.current.roundCount) {
      setPhase('submitting');
      return;
    }

    setPhase(activeRunIndex === 0 ? 'results' : 'assessment-break');
  }, []);

  useEffect(() => {
    finishRunRef.current = finishRun;
  }, [finishRun]);

  const closeAssessment = useCallback(() => {
    clearSession();
    closeAssessmentWindow(candidateSessionDocumentId);
  }, [clearSession, candidateSessionDocumentId]);

  const restartPractice = useCallback(() => {
    setResults((previousResults) =>
      previousResults.filter((result) => result.runIndex !== 0)
    );
    beginCountdown(0);
  }, [beginCountdown]);

  // Sync local runs when the store is hydrated after initial render
  useEffect(() => {
    if (storeRuns.length > 0) {
      setRuns(storeRuns);
    }
  }, [storeRuns]);

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

  // Automatically focus the typing input field when the running phase starts
  useEffect(() => {
    if (phase === 'running') {
      const timer = setTimeout(() => {
        captureRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== 'running' || !runStarted || isPaused) return;

    captureRef.current?.focus();
    const duration = configRef.current.timeLimitPerRound;
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
        void AssessmentProgressService.saveProgress(
          progress,
          sessionIdRef.current,
          candidateSessionDocumentId
        );
      }, 15_000);
    }

    return () => {
      globalThis.clearInterval(timerId);
      if (autoSaveIntervalId !== undefined) globalThis.clearInterval(autoSaveIntervalId);
    };
  }, [candidateSessionDocumentId, phase, enableAutoSave, runStarted, isPaused]);

  useEffect(() => {
    if (phase !== 'submitted' || submitError) return;
    void markCompleted();
  }, [markCompleted, phase, submitError]);

  useEffect(() => {
    if (phase !== 'submitting') return;

    setSubmissionStatus('submitting');
    let cancelled = false;

    const submit = async () => {
      try {
        const response = await fetch(getAssessmentSubmitUrl('typing'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runs: results,
            startedAt: startedAtRef.current ?? new Date().toISOString(),
            completedAt: new Date().toISOString(),
            assessmentId: assessmentIdRef.current,
            candidateSessionDocumentId,
            difficulty: configRef.current.difficulty,
            assessmentVersion: configRef.current.version,
          }),
        });

        if (!cancelled) {
          if (response.ok || response.status === 409) {
            // 409 = already submitted (idempotency guard) — treat as success
            notifyAssessmentCompleted('typing');
            setSubmissionStatus('submitted');
          } else {
            const body = await response.json().catch(() => ({}));
            setSubmitError(
              (body as { error?: string }).error ??
                'Submission failed. Please contact support.'
            );
            setSubmissionStatus('error');
          }
          setPhase('submitted');
        }
      } catch {
        if (!cancelled) {
          setSubmitError('Network error. Please contact support.');
          setSubmissionStatus('error');
          setPhase('submitted');
        }
      }
    };

    void submit();

    return () => {
      cancelled = true;
    };
  }, [candidateSessionDocumentId, phase, results, setSubmissionStatus]);

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
    if (!runStarted) {
      if (currentRunIndex === 0) {
        startedAtRef.current = new Date().toISOString();
      }
      setRunStarted(true);
    }
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
  const elapsedSeconds = runStarted ? currentDuration - timeLeft : 0;
  const liveWpm =
    elapsedSeconds > 0 ? Math.round(liveCorrectCount / 5 / (elapsedSeconds / 60)) : 0;
  const progressValue = runStarted
    ? ((currentDuration - timeLeft) / currentDuration) * 100
    : 0;

  const lines = useMemo(() => getLines(currentText, 72), [currentText]);
  const activeLineIndex = useMemo(() => {
    let index = lines.findIndex(l => typedCount >= l.startIndex && typedCount < l.endIndex);
    if (index === -1) {
       index = lines.length > 0 ? lines.length - 1 : 0;
    }
    return index;
  }, [typedCount, lines]);
  const visibleLines = lines.slice(activeLineIndex, activeLineIndex + 3);
  const displayLines = [
    ...visibleLines,
    ...Array.from({ length: Math.max(0, 3 - visibleLines.length) }, (_, index) => ({
      text: '',
      startIndex: currentText.length + index,
      endIndex: currentText.length + index,
    })),
  ].slice(0, 3);

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
        icon={Keyboard}
        title="Typing Speed & Accuracy"
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
      : phase === 'countdown' && isPracticeRun
        ? 'practice'
        : phase === 'running' && isPracticeRun
          ? 'practice'
          : phase === 'results'
            ? 'review'
            : 'live';

  return (
    <AssessmentGameShell
      icon={Keyboard}
      title="Typing Speed & Accuracy"
      eyebrow="CTRL assessment"
      status={phase === 'running' ? (runStarted ? `${timeLeft}s remaining` : 'Start typing') : runLabel}
    >
      <AssessmentReconnectOverlay open={isReconnecting} secondsRemaining={reconnectSecondsLeft ?? undefined} />
      <div className="flex flex-col w-full">
        {/* Visual Stepper Progress */}
        {phase !== 'countdown' && phase !== 'running' && phase !== 'submitting' && phase !== 'submitted' && (
          <div className="mb-6 w-full">
            <AssessmentFlowStepper currentStep={stepperStep} />
          </div>
        )}
        {phase === 'landing' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-5 flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Secure typing exercise
          </div>
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <Keyboard className="h-8 w-8" aria-hidden="true" />
          </div>
          <p className="max-w-2xl text-2xl font-semibold leading-tight tracking-normal text-foreground sm:text-3xl">
            CTRL Typing Assessment
          </p>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Reproduce a passage of text as accurately and efficiently as possible. This assessment measures typing speed and typing accuracy only.
          </p>
          <div className="mt-6 grid w-full max-w-2xl gap-3 text-left sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <FileText className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">Incident passage</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">A policing incident passage is shown on screen.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <Keyboard className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">Typing response box</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Type the passage exactly as displayed.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <Timer className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">{currentDuration} seconds</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">The visible timer ends each exercise automatically.</p>
            </div>
          </div>
          <Button
            className="mt-8 h-12 px-7"
            size="lg"
            onClick={() => setPhase('rules')}
          >
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
                {selectedDifficulty} level
              </Badge>
              <h1 className="mb-4 text-3xl font-semibold leading-tight text-foreground">CTRL Typing Assessment</h1>
              <p>
                This assessment is designed to measure your typing speed and typing accuracy when reproducing written information.
              </p>
              <p className="mt-4">
                It assesses typing ability only. It does not assess policing knowledge, decision-making ability, operational judgement, or previous experience.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr]">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mb-3 text-lg font-semibold text-foreground">What You Will See</h2>
                <p>You will see a passage based on a reported policing incident, normally around 200 words, along with:</p>
                <div className="mt-4 grid gap-2">
                  {['A passage of text', 'A typing response box', 'A countdown timer'].map((item) => (
                    <div key={item} className="flex items-center gap-2 rounded-lg bg-muted p-3 text-foreground dark:bg-white/5">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Keyboard className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mb-3 text-lg font-semibold text-foreground">Your Task</h2>
                <p>Type the passage into the response box exactly as it appears.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {['Spelling', 'Punctuation', 'Capital letters', 'Spacing', 'Numbers'].map((item) => (
                    <div key={item} className="rounded-lg border border-border bg-background p-3 text-center text-foreground dark:border-white/10 dark:bg-white/[0.02]">
                      {item}
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-300">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p className="text-xs">
                      Do not use copy and paste, speech-to-text software, abbreviations, or leave/refresh the page.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03] flex flex-col justify-between">
                <div>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10 text-green-600 dark:text-green-400">
                    <Keyboard className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h2 className="mb-3 text-lg font-semibold text-foreground">Interactive Demo</h2>
                  <p className="mb-4">Watch how errors are highlighted. Backspace to correct them before continuing.</p>
                </div>
                <TypingAnimationPreview />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <h2 className="mb-3 text-lg font-semibold text-foreground">Assessment Measures</h2>
              <p>The assessment measures typing speed, shown as Words Per Minute, and typing accuracy.</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {['Typing Speed (Words Per Minute)', 'Typing Accuracy'].map((item) => (
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
                  <h2 className="text-lg font-semibold text-foreground">Practice Exercise</h2>
                </div>
                <p>There is one practice exercise first. Use it to get familiar with the typing screen, timer and response box. Your practice result is not scored and is not included in your final result.</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-600 dark:text-green-400">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">Live Assessment</h2>
                </div>
                <p>After practice, you will move into the live assessment. It contains {liveExerciseLabel}. Each exercise lasts {currentDuration} seconds, is scored, and automatically ends when the timer reaches zero.</p>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">Numbered Assessment Instructions</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  'Complete the unscored practice exercise first',
                  'Read the passage carefully before you start typing',
                  'Place your cursor in the response box',
                  'Begin typing when you are ready to start the timer',
                  'Type the text exactly as shown, including punctuation and spacing',
                  'Correct any mistakes if you notice them',
                  'Continue typing until the timer reaches zero',
                  'After practice, continue to the scored live exercises',
                ].map((step, index) => (
                  <div key={step} className="rounded-lg bg-muted p-3 dark:bg-white/5">
                    <span className="font-semibold text-foreground">{index + 1}.</span> {step}
                  </div>
                ))}
              </div>
            </div>

          </div>
          <div className="mt-10 flex flex-col gap-3 border-t border-border pt-8 dark:border-white/10 sm:flex-row">
            <Button size="lg" className="h-12" onClick={() => beginCountdown(0)}>
              Go to practice
              <Play className="ml-2 h-4 w-4" aria-hidden="true" />
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
              {isPracticeRun ? 'Practice typing run' : runLabel}
            </p>
            {!isPracticeRun && (
              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                This is a live {currentDuration}-second assessment run. The timer starts when
                you type the first character.
              </p>
            )}
            <p className="mt-7 text-7xl font-semibold tabular-nums text-foreground sm:text-8xl">
              {countdown}
            </p>
          </div>
        </div>
      )}

      {phase === 'running' && (
        <div className="mx-auto flex min-h-[520px] w-full flex-col justify-center">
          <textarea
            ref={captureRef}
            aria-label="Typing capture area"
            className="sr-only"
            autoComplete="off"
            spellCheck={false}
            onKeyDown={handleKeyDown}
            value=""
            readOnly
          />

          <div className="mb-5 rounded-xl border border-border bg-card p-4 text-sm font-medium text-foreground shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            Type the passage exactly as shown. Correct mistakes if you spot them.
          </div>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {runLabel}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                {runStarted ? `${timeLeft}s` : 'Ready'}
              </p>
              {!runStarted && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Start typing to begin the timer.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              {isPracticeRun && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={restartPractice}
                >
                  <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Restart practice
                </Button>
              )}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-xl border border-border px-3 py-2 dark:border-white/10">
                  <p className="text-muted-foreground">WPM</p>
                  <p className="mt-1 font-mono text-base text-green-600 dark:text-green-400">
                    {liveWpm}
                  </p>
                </div>
                <div className="rounded-xl border border-border px-3 py-2 dark:border-white/10">
                  <p className="text-muted-foreground">Accuracy</p>
                  <p className="mt-1 font-mono text-base text-blue-600 dark:text-blue-400">
                    {typedCount === 0 ? 100 : Math.round((liveCorrectCount / typedCount) * 100)}%
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
          </div>

          <Progress value={progressValue} className="mb-5 h-2" />

          <button
            type="button"
            className="h-[12rem] w-full cursor-text overflow-hidden rounded-2xl border border-border bg-muted/30 p-5 text-left shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary dark:border-white/10 dark:bg-white/[0.03] sm:p-6"
            onClick={() => captureRef.current?.focus()}
          >
            <span className="grid h-full grid-rows-3 font-mono text-lg leading-[2.6rem] text-foreground sm:text-xl sm:leading-[2.8rem]">
              {displayLines.map((line, lineIndex) => (
                <span
                  key={`${line.startIndex}-${lineIndex}`}
                  className={[
                    'block overflow-hidden whitespace-pre-wrap border-b border-border/60 last:border-b-0 dark:border-white/10',
                    lineIndex === 0 ? 'text-foreground' : 'text-foreground/70',
                  ].join(' ')}
                >
                  {line.text.split('').map((character, offset) => {
                    const index = line.startIndex + offset;
                    const typedCharacter = typedCharacters[index];
                    const hasBeenTyped = typedCharacter !== undefined;
                    const isCurrentCharacter = index === typedCharacters.length;
                    const isCorrect = typedCharacter === character;

                    return (
                      <span
                        key={`${index}-${character}`}
                        className={[
                          hasBeenTyped && isCorrect
                            ? 'text-muted-foreground/55'
                            : '',
                          hasBeenTyped && !isCorrect
                            ? 'rounded-sm bg-red-500/10 text-red-600 dark:text-red-400'
                            : '',
                          isCurrentCharacter
                            ? 'rounded-sm bg-primary/15 text-foreground ring-1 ring-primary/40'
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
              ))}
            </span>
          </button>
        </div>
      )}

      {phase === 'results' && latestResult && (
        <div className="mx-auto flex min-h-[520px] w-full flex-col justify-center text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Timer className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400 font-bold">
            Practice Run Complete
          </p>
          <p className="mt-3 text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            Prepare for Scored Live Assessment
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground border border-amber-500/20 bg-amber-500/5 p-4 rounded-xl shadow-sm">
            <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1">WARNING:</span> You are about to start the live scored assessment rounds. These exercises will determine your final typing speed and accuracy score. Take a break if needed, and click below when you are ready to begin.
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
          <div className="mx-auto mt-7 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Stay steady</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Keep a controlled pace. Mistakes can be corrected, but the timer keeps moving.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Corrections</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                You can backspace to fix mistakes during the run.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Live runs</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {finalRunIndex} timed runs follow. Scores are submitted at the end.
              </p>
            </div>
          </div>
          <div className="mx-auto mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8"
              onClick={restartPractice}
            >
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Restart practice
            </Button>
            <Button
              size="lg"
              className="h-12 px-8"
              onClick={() => beginCountdown(currentRunIndex + 1)}
            >
              {nextRunIsFirstAssessment ? 'Start assessment block' : 'Continue'}
            </Button>
          </div>
        </div>
      )}

      {phase === 'assessment-break' && latestResult && (
        <div className="mx-auto flex min-h-[520px] w-full max-w-3xl flex-col justify-center text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Coffee className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Assessment run {latestResult.runIndex} complete
          </p>
          <p className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Take a moment if you need it
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Your live assessment is still in progress. No score is shown between
            assessment runs. Press continue when you are ready for the next
            {currentDuration}-second run.
          </p>
          <Button
            size="lg"
            className="mx-auto mt-8 h-12 px-8"
            onClick={() => beginCountdown(currentRunIndex + 1)}
          >
            Continue to run {latestResult.runIndex + 1}
          </Button>
        </div>
      )}

      {phase === 'submitting' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Typing assessment complete
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
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
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
              Thank you. Your assessment has been submitted successfully. Please
              complete any remaining assessments in My Assessments. If all
              sections are complete, await further information from the Hiring
              Manager.
            </p>
          )}
          <Button
            variant="outline"
            className="mt-8 h-11 px-6"
            onClick={closeAssessment}
          >
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            Close assessment
          </Button>
        </div>
      )}
      </div>
    </AssessmentGameShell>
  );
}
