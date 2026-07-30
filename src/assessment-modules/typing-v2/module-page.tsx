"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock3, Keyboard, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OperationalReadinessPage } from "../shared/operational-readiness-page";
import { TrackedAssessmentShell } from "../shared/tracked-assessment-shell";
import { useDeferredAdvance } from "../shared/use-deferred-advance";
import type { LaunchEnvelope } from "../types";

type Passage = { id: string; level: "easy" | "intermediate" | "advanced"; number: number; title: string; sourceText: string; durationSeconds?: number };
type TypingEvent = { elapsedMs: number; type: "insert" | "delete"; position: number; character?: string };
type TestState = { typedText: string; events: TypingEvent[]; startedAt: number | null; complete: boolean; armed: boolean };
type State = { tests: Record<string, TestState> };
type Content = { passages: Passage[]; durationSeconds: number; breakSeconds: number };

function emptyTest(armed = true): TestState {
  return { typedText: "", events: [], startedAt: null, complete: false, armed };
}

function createState(passages: Passage[], armed = true): State {
  return { tests: Object.fromEntries(passages.map((passage) => [passage.id, emptyTest(armed)])) };
}

function practiceMetrics(typedText: string, sourceText: string, durationSeconds: number) {
  const correct = [...typedText].filter((character, index) => character === sourceText[index]).length;
  return {
    wpm: Math.round((typedText.length / 5) / Math.max(durationSeconds / 60, 1 / 60)),
    accuracy: typedText.length ? Math.round((correct / typedText.length) * 1_000) / 10 : 0,
  };
}

function typingEventsForChange(previous: string, next: string, elapsedMs: number): TypingEvent[] {
  let prefix = 0;
  while (prefix < previous.length && prefix < next.length && previous[prefix] === next[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < previous.length - prefix
    && suffix < next.length - prefix
    && previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]
  ) suffix += 1;
  const deletedCount = previous.length - prefix - suffix;
  const inserted = next.slice(prefix, next.length - suffix);
  const events: TypingEvent[] = [];
  for (let index = 0; index < deletedCount; index += 1) {
    events.push({ elapsedMs, type: "delete", position: prefix + deletedCount - index });
  }
  for (let index = 0; index < inserted.length; index += 64) {
    events.push({ elapsedMs, type: "insert", position: prefix + index, character: inserted.slice(index, index + 64) });
  }
  return events;
}

function TimedTypingWorkspace({
  passage,
  durationSeconds,
  state,
  onChange,
  onComplete,
  practice = false,
}: {
  passage: Passage;
  durationSeconds: number;
  state: TestState;
  onChange: (state: TestState) => void;
  onComplete?: (state: TestState) => void;
  practice?: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  const [caretPosition, setCaretPosition] = useState(state.typedText.length);
  const completedOnce = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const remaining = state.startedAt === null
    ? durationSeconds
    : Math.max(0, durationSeconds - Math.floor((now - state.startedAt) / 1_000));
  const incorrectCount = useMemo(() => [...state.typedText].filter((character, index) => character !== passage.sourceText[index]).length, [passage.sourceText, state.typedText]);

  useEffect(() => {
    if (state.startedAt === null || state.complete) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [state.complete, state.startedAt]);

  useEffect(() => {
    if (remaining > 0 || state.complete || completedOnce.current) return;
    completedOnce.current = true;
    const completed = { ...state, complete: true };
    onChange(completed);
    onComplete?.(completed);
  }, [onChange, onComplete, remaining, state]);

  useEffect(() => {
    if (!practice && state.armed && !state.complete) textareaRef.current?.focus();
  }, [practice, state.armed, state.complete]);

  useEffect(() => {
    setCaretPosition((position) => Math.min(position, state.typedText.length));
  }, [state.typedText.length]);

  if (!state.armed) return (
    <section className="border border-border bg-card p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">90-second practice</p>
      <h1 className="mt-2 text-2xl font-semibold">Learn the typing workspace</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
        Type directly through the passage in one continuous field. The caret marks your position, completed text settles into the foreground and errors are marked inline. Practice results do not affect your assessment.
      </p>
      <Button type="button" className="mt-5 min-h-11 rounded-sm" onClick={() => onChange({ ...state, armed: true })}>
        <Keyboard className="h-4 w-4" aria-hidden="true" /> Start practice
      </Button>
    </section>
  );

  if (state.complete && practice) {
    const metrics = practiceMetrics(state.typedText, passage.sourceText, durationSeconds);
    return (
      <section className="border border-border bg-card p-6 sm:p-8" aria-live="polite">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Practice complete</p>
        <h1 className="mt-2 text-2xl font-semibold">Your practice feedback</h1>
        <dl className="mt-5 grid grid-cols-2 divide-x divide-border border-y border-border py-4">
          <div className="px-4 first:pl-0"><dt className="text-xs text-muted-foreground">Approximate speed</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{metrics.wpm} WPM</dd></div>
          <div className="px-4"><dt className="text-xs text-muted-foreground">Character accuracy</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{metrics.accuracy}%</dd></div>
        </dl>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">Use this feedback to settle into a steady, accurate pace. These figures are not included in your assessed result.</p>
        <Button type="button" variant="outline" className="mt-5 min-h-11 rounded-sm" onClick={() => { completedOnce.current = false; onChange(emptyTest(false)); }}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Repeat practice
        </Button>
      </section>
    );
  }

  return (
    <section className="border border-border bg-card" aria-labelledby={`${passage.id}-title`}>
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{practice ? "Unscored practice" : `${passage.level} passage`}</p>
          <h1 id={`${passage.id}-title`} className="mt-1 text-lg font-semibold">{passage.title}</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{state.startedAt === null ? "Starts with first key" : "Time remaining"}</p>
          <p className="mt-1 flex items-center justify-end gap-2 font-mono text-xl font-semibold tabular-nums">
            <Clock3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}
          </p>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <label htmlFor={`${passage.id}-entry`} className="text-sm font-semibold">Typing response</label>
            <p id={`${passage.id}-instructions`} className="mt-1 text-xs leading-5 text-muted-foreground">
              Type the target passage directly into this field. Keep a steady rhythm; you can use Backspace to correct your latest entry.
            </p>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground" aria-hidden="true">
            <span className="tabular-nums">{state.typedText.length} entered</span>
            <span className="tabular-nums">{incorrectCount} {incorrectCount === 1 ? "mismatch" : "mismatches"}</span>
          </div>
        </div>

        <p id={`${passage.id}-source`} className="sr-only">Target passage: {passage.sourceText}</p>
        <div
          className="relative min-h-[360px] cursor-text overflow-hidden border border-border bg-background p-5 font-mono text-base leading-8 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background sm:p-6 sm:text-lg sm:leading-9"
          onClick={() => textareaRef.current?.focus()}
        >
          <p className="whitespace-pre-wrap break-words" aria-hidden="true">
            {[...passage.sourceText].map((character, index) => {
              const typed = state.typedText[index];
              const visibleCharacter = typed ?? character;
              const isCaret = index === caretPosition && !state.complete;
              const status = typed === undefined
                ? "text-muted-foreground/70"
                : typed === character
                  ? "text-foreground"
                  : "bg-destructive/15 text-destructive underline decoration-2 underline-offset-4";
              const caret = isCaret ? "bg-primary/15 shadow-[inset_2px_0_0_hsl(var(--primary))]" : "";
              return <span key={`${index}-${character}`} className={`${status} ${caret}`}>{visibleCharacter}</span>;
            })}
            {caretPosition >= passage.sourceText.length && !state.complete ? (
              <span className="shadow-[inset_2px_0_0_hsl(var(--primary))]" aria-hidden="true">&nbsp;</span>
            ) : null}
          </p>
          <textarea
            ref={textareaRef}
            id={`${passage.id}-entry`}
            className="absolute inset-0 z-10 h-full w-full cursor-text resize-none bg-transparent p-5 font-mono text-base leading-8 text-transparent caret-transparent outline-none selection:bg-transparent break-words whitespace-pre-wrap sm:p-6 sm:text-lg sm:leading-9"
            value={state.typedText}
            disabled={state.complete}
            spellCheck={false}
            aria-describedby={`${passage.id}-instructions ${passage.id}-source`}
            autoCapitalize="off"
            autoCorrect="off"
            onSelect={(event) => setCaretPosition(event.currentTarget.selectionStart)}
            onChange={(event) => {
              const startedAt = state.startedAt ?? Date.now();
              const elapsedMs = Math.max(0, Date.now() - startedAt);
              const typedText = event.currentTarget.value;
              setCaretPosition(event.currentTarget.selectionStart);
              const nextEvents = typingEventsForChange(state.typedText, typedText, elapsedMs);
              onChange({
                ...state,
                startedAt,
                typedText,
                events: [...state.events, ...nextEvents],
              });
            }}
          />
        </div>
        <p className="sr-only" aria-live="polite">{state.complete ? "Typing passage complete." : ""}</p>
      </div>
    </section>
  );
}

function CountdownBreak({ seconds, nextLabel, onComplete }: { seconds: number; nextLabel: string; onComplete: () => void }) {
  const targetTime = useRef(Date.now() + seconds * 1_000);
  const [remaining, setRemaining] = useState(seconds);
  const completed = useRef(false);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const diff = Math.max(0, Math.ceil((targetTime.current - Date.now()) / 1_000));
      setRemaining(diff);
    }, 250);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (remaining !== 0 || completed.current) return;
    completed.current = true;
    onComplete();
  }, [onComplete, remaining]);
  return (
    <section className="border border-border bg-card p-8 text-center">
      <p className="sr-only" role="status">
        Controlled transition. {nextLabel} opens in {seconds} seconds.
      </p>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Controlled transition</p>
      <p
        className="mt-4 font-mono text-5xl font-semibold tabular-nums"
        aria-label={`${remaining} seconds remaining`}
      >
        {remaining}
      </p>
      <h1 className="mt-4 text-xl font-semibold">{nextLabel} opens automatically</h1>
      <p className="mt-2 text-sm text-muted-foreground">Rest your hands and remain on this assessment page.</p>
    </section>
  );
}

function Assessed({ launch }: { launch: LaunchEnvelope<Content> }) {
  const { passages, durationSeconds, breakSeconds } = launch.content;
  const reviewStage = 6;
  return (
    <TrackedAssessmentShell<Content, State>
      launch={launch}
      title="Typing Assessment"
      restartNoun="passage set"
      initialState={() => createState(passages)}
      validateStage={(stage, state) => {
        if (stage >= reviewStage) {
          const incomplete = passages.some(
            (passage) => !state.tests[passage.id]?.complete,
          );
          if (incomplete) {
            return "Complete all three typing tests before submitting.";
          }
        }
        return null;
      }}
      canManuallyAdvance={(stage) => stage === 0}
      continueLabel={() => "Focus typing field"}
      buildSubmission={(state) => ({
        tests: passages.map((passage) => ({
          passageId: passage.id,
          typedText: state.tests[passage.id].typedText,
          events: state.tests[passage.id].events,
        })),
      })}
      renderStage={({ stageIndex, state, setState, advance, isSaving }) => (
        <TypingStages
          stageIndex={stageIndex}
          state={state}
          setState={setState}
          advance={advance}
          isSaving={isSaving}
          passages={passages}
          durationSeconds={durationSeconds}
          breakSeconds={breakSeconds}
        />
      )}
    />
  );
}

function TypingStages({
  stageIndex,
  state,
  setState,
  advance,
  isSaving,
  passages,
  durationSeconds,
  breakSeconds,
}: {
  stageIndex: number;
  state: State;
  setState: (state: State) => void;
  advance: (nextState?: State) => Promise<void>;
  isSaving: boolean;
  passages: Passage[];
  durationSeconds: number;
  breakSeconds: number;
}) {
  const deferAdvance = useDeferredAdvance(isSaving, advance);
  if (stageIndex === 0) {
    return (
      <section className="border border-border bg-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Monitoring active</p>
        <h1 className="mt-2 text-2xl font-semibold">Three timed typing tests</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">Each test lasts 90 seconds and starts with your first keystroke. A 10-second transition follows tests one and two. Continue typing until the test closes automatically.</p>
      </section>
    );
  }
  if (stageIndex === 2 || stageIndex === 4) {
    const nextTest = stageIndex === 2 ? 2 : 3;
    return (
      <CountdownBreak
        seconds={breakSeconds}
        nextLabel={`Typing test ${nextTest}`}
        onComplete={() => deferAdvance()}
      />
    );
  }
  if (stageIndex === 1 || stageIndex === 3 || stageIndex === 5) {
    const passageIndex = stageIndex === 1 ? 0 : stageIndex === 3 ? 1 : 2;
    const passage = passages[passageIndex];
    return (
      <TimedTypingWorkspace
        passage={passage}
        durationSeconds={durationSeconds}
        state={state.tests[passage.id]}
        onChange={(next) => setState({ tests: { ...state.tests, [passage.id]: next } })}
        onComplete={(next) => {
          deferAdvance({ tests: { ...state.tests, [passage.id]: next } });
        }}
      />
    );
  }
  return (
    <section className="border border-border bg-card p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Final review</p>
      <h1 className="mt-2 text-2xl font-semibold">Submit typing performance</h1>
      <div className="mt-5 grid gap-px bg-border sm:grid-cols-3">
        {passages.map((passage, index) => (
          <div key={passage.id} className="bg-card p-4">
            <p className="text-xs text-muted-foreground">Test {index + 1}</p>
            <p className="mt-1 flex items-center gap-2 font-semibold">
              <Check className="h-4 w-4 text-primary" aria-hidden="true" />{" "}
              {state.tests[passage.id]?.complete ? "Complete" : "Incomplete"}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">Speed, accuracy and stability are calculated after submission. No immediate score is shown.</p>
    </section>
  );
}

export function TypingModulePage({ candidateSessionDocumentId, slug }: { candidateSessionDocumentId: string; slug: string }) {
  const createPracticeState = useCallback((practice: Passage) => createState([practice], false), []);
  return (
    <OperationalReadinessPage<Passage, State, Content>
      candidateSessionDocumentId={candidateSessionDocumentId}
      slug={slug}
      createPracticeState={createPracticeState}
      isPracticeComplete={(state) => Object.values(state.tests)[0]?.complete ?? false}
      renderPractice={(practice, state, setState) => (
        <TimedTypingWorkspace
          practice
          passage={practice}
          durationSeconds={practice.durationSeconds ?? 90}
          state={state.tests[practice.id]}
          onChange={(next) => setState({ tests: { [practice.id]: next } })}
        />
      )}
      renderAssessment={(launch) => <Assessed launch={launch} />}
    />
  );
}
