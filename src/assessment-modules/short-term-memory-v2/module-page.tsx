"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OperationalReadinessPage } from "../shared/operational-readiness-page";
import { TrackedAssessmentShell } from "../shared/tracked-assessment-shell";
import type { LaunchEnvelope } from "../types";

type Option = { id: string; label: string };
type Exercise = {
  id: string;
  title: string;
  briefing: { heading: string; paragraphs: string[]; displaySeconds: number };
  interruptionTasks: Array<{ id: string; prompt: string; options: Option[] }>;
  recallFields: Array<{ id: string; label: string }>;
  eventOptions: Option[];
  flawedRecord: Array<{ id: string; label: string; value: string }>;
};
type State = {
  interruptionAnswers: Record<string, string>;
  recall: Record<string, string>;
  sequence: string[];
  corrections: Record<string, string>;
  briefingAvailableUntil: number;
  briefingRemainingSeconds: number;
};
type Content = { exercise: Exercise };

function emptyState(exercise: Exercise, timed: boolean): State {
  const briefingRemainingSeconds = timed ? exercise.briefing.displaySeconds : 0;
  return {
    interruptionAnswers: {},
    recall: {},
    sequence: exercise.eventOptions.map(() => ""),
    corrections: {},
    briefingRemainingSeconds,
    briefingAvailableUntil: Date.now() + briefingRemainingSeconds * 1_000,
  };
}

function restoreBriefingClock(state: State): State {
  const remaining = Math.max(
    0,
    state.briefingRemainingSeconds ??
      Math.ceil((state.briefingAvailableUntil - Date.now()) / 1_000),
  );
  return {
    ...state,
    briefingRemainingSeconds: remaining,
    briefingAvailableUntil: Date.now() + remaining * 1_000,
  };
}

function Briefing({
  exercise,
  availableUntil,
  onRemainingChange,
}: {
  exercise: Exercise;
  availableUntil: number;
  onRemainingChange?: (remainingSeconds: number) => void;
}) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.ceil((availableUntil - Date.now()) / 1_000)),
  );
  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((availableUntil - Date.now()) / 1_000));
      setRemaining(next);
      onRemainingChange?.(next);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [availableUntil, onRemainingChange]);
  return (
    <section className="border border-border bg-card p-7  ">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4 ">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
            One-time briefing
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            {exercise.briefing.heading}
          </h1>
        </div>
        <div className="border border-border px-3 py-2 font-mono text-sm">
          {remaining}s
        </div>
      </div>
      <div className="mt-6 space-y-4 text-base leading-8 text-foreground ">
        {exercise.briefing.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <p className="mt-6 border-l-4 border-border bg-muted p-4 text-sm ">
        The briefing is removed when you continue. Notes and clipboard actions
        are not available.
      </p>
    </section>
  );
}

function BriefingWithResumeClock({
  exercise,
  state,
  setState,
}: {
  exercise: Exercise;
  state: State;
  setState: (state: State) => void;
}) {
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const next = restoreBriefingClock(state);
    if (
      next.briefingAvailableUntil !== state.briefingAvailableUntil ||
      next.briefingRemainingSeconds !== state.briefingRemainingSeconds
    ) {
      setState(next);
    }
  }, [setState, state]);

  return (
    <Briefing
      exercise={exercise}
      availableUntil={state.briefingAvailableUntil}
      onRemainingChange={(remainingSeconds) =>
        setState({
          ...state,
          briefingRemainingSeconds: remainingSeconds,
          briefingAvailableUntil: Date.now() + remainingSeconds * 1_000,
        })
      }
    />
  );
}

function Interruption({
  exercise,
  state,
  setState,
}: {
  exercise: Exercise;
  state: State;
  setState: (state: State) => void;
}) {
  return (
    <section className="border border-border bg-card p-7  ">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Interruption task
      </p>
      <h1 className="mt-2 text-2xl font-semibold">
        Complete the control checks
      </h1>
      <div className="mt-6 space-y-6">
        {exercise.interruptionTasks.map((task) => (
          <fieldset key={task.id}>
            <legend className="font-semibold">{task.prompt}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {task.options.map((option) => (
                <label
                  key={option.id}
                  className={`cursor-pointer border px-4 py-3 text-sm ${state.interruptionAnswers[task.id] === option.id ? "border-primary bg-primary/10  " : "border-border "}`}
                >
                  <input
                    className="mr-2"
                    type="radio"
                    name={task.id}
                    checked={state.interruptionAnswers[task.id] === option.id}
                    onChange={() =>
                      setState({
                        ...state,
                        interruptionAnswers: {
                          ...state.interruptionAnswers,
                          [task.id]: option.id,
                        },
                      })
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </section>
  );
}

function Recall({
  exercise,
  state,
  setState,
}: {
  exercise: Exercise;
  state: State;
  setState: (state: State) => void;
}) {
  return (
    <section className="border border-border bg-card p-7  ">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Delayed recall
      </p>
      <h1 className="mt-2 text-2xl font-semibold">
        Reconstruct the key operational facts
      </h1>
      <p className="mt-3 text-sm text-muted-foreground ">
        Enter only details you remember. Do not invent a missing value.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {exercise.recallFields.map((field) => (
          <label key={field.id} className="text-sm font-semibold">
            {field.label}
            <input
              className="mt-2 h-11 w-full border border-border bg-card px-3 font-normal "
              value={state.recall[field.id] ?? ""}
              onChange={(event) =>
                setState({
                  ...state,
                  recall: { ...state.recall, [field.id]: event.target.value },
                })
              }
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function Sequence({
  exercise,
  state,
  setState,
}: {
  exercise: Exercise;
  state: State;
  setState: (state: State) => void;
}) {
  return (
    <section className="border border-border bg-card p-7  ">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Event sequence
      </p>
      <h1 className="mt-2 text-2xl font-semibold">
        Put the events in briefing order
      </h1>
      <div className="mt-6 space-y-3">
        {state.sequence.map((selected, index) => (
          <label
            key={index}
            className="flex items-center gap-4 text-sm font-semibold"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center border border-border">
              {index + 1}
            </span>
            <select
              className="h-11 w-full border border-border bg-card px-3 font-normal "
              value={selected}
              onChange={(event) =>
                setState({
                  ...state,
                  sequence: state.sequence.map((value, itemIndex) =>
                    itemIndex === index ? event.target.value : value,
                  ),
                })
              }
            >
              <option value="">Choose event</option>
              {exercise.eventOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}

function Corrections({
  exercise,
  state,
  setState,
}: {
  exercise: Exercise;
  state: State;
  setState: (state: State) => void;
}) {
  return (
    <section className="border border-border bg-card p-7  ">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Record correction
      </p>
      <h1 className="mt-2 text-2xl font-semibold">
        Correct the flawed operational record
      </h1>
      <div className="mt-6 divide-y divide-border border-y border-border  ">
        {exercise.flawedRecord.map((field) => (
          <div key={field.id} className="grid gap-3 py-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {field.label}
              </p>
              <p className="mt-1 font-medium line-through decoration-red-700">
                {field.value}
              </p>
            </div>
            <label className="text-sm font-semibold">
              Correct value
              <input
                className="mt-2 h-11 w-full border border-border bg-card px-3 font-normal "
                value={state.corrections[field.id] ?? ""}
                onChange={(event) =>
                  setState({
                    ...state,
                    corrections: {
                      ...state.corrections,
                      [field.id]: event.target.value,
                    },
                  })
                }
              />
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}

function Assessed({ launch }: { launch: LaunchEnvelope<Content> }) {
  const exercise = launch.content.exercise;
  return (
    <TrackedAssessmentShell
      launch={launch}
      title="Short-Term Memory"
      restartNoun="operational briefing"
      initialState={() => emptyState(exercise, true)}
      validateStage={(stage, state) => {
        if (stage === 0 && Date.now() < state.briefingAvailableUntil)
          return "Review the briefing until its display period ends.";
        if (
          stage === 1 &&
          Object.keys(state.interruptionAnswers).length !==
            exercise.interruptionTasks.length
        )
          return "Complete every interruption task.";
        if (
          stage === 2 &&
          exercise.recallFields.some(
            (field) => !(state.recall[field.id] ?? "").trim(),
          )
        )
          return "Complete every recall field; use “not recalled” where necessary.";
        if (
          stage === 3 &&
          (state.sequence.some((value) => !value) ||
            new Set(state.sequence).size !== state.sequence.length)
        )
          return "Use every event once to create a complete sequence.";
        if (
          stage === 4 &&
          exercise.flawedRecord.some(
            (field) => !(state.corrections[field.id] ?? "").trim(),
          )
        )
          return "Enter a correction for every flawed record field.";
        return null;
      }}
      buildSubmission={(state, elapsedSeconds) => ({
        exerciseId: exercise.id,
        interruptionAnswers: Object.entries(state.interruptionAnswers).map(
          ([taskId, optionId]) => ({ taskId, optionId }),
        ),
        recall: state.recall,
        sequence: state.sequence,
        corrections: state.corrections,
        elapsedSeconds,
      })}
      renderStage={({ stageIndex, state, setState }) => {
        if (stageIndex === 0)
          return (
            <BriefingWithResumeClock
              exercise={exercise}
              state={state}
              setState={setState}
            />
          );
        if (stageIndex === 1)
          return (
            <Interruption
              exercise={exercise}
              state={state}
              setState={setState}
            />
          );
        if (stageIndex === 2)
          return (
            <Recall exercise={exercise} state={state} setState={setState} />
          );
        if (stageIndex === 3)
          return (
            <Sequence exercise={exercise} state={state} setState={setState} />
          );
        if (stageIndex === 4)
          return (
            <Corrections
              exercise={exercise}
              state={state}
              setState={setState}
            />
          );
        return (
          <section className="border border-border bg-card p-7  ">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Final review
            </p>
            <h1 className="mt-2 text-2xl font-semibold">
              Submit the reconstructed record
            </h1>
            <p className="mt-4 leading-7 text-foreground ">
              Your interruption answers, recalled details, event order and
              corrections will be submitted together. The briefing cannot be
              reopened.
            </p>
          </section>
        );
      }}
    />
  );
}

export function ShortTermMemoryModulePage({
  candidateSessionDocumentId,
  slug,
}: {
  candidateSessionDocumentId: string;
  slug: string;
}) {
  const createPracticeState = useCallback(
    (practice: Exercise) => emptyState(practice, false),
    [],
  );
  return (
    <OperationalReadinessPage<Exercise, State, Content>
      candidateSessionDocumentId={candidateSessionDocumentId}
      slug={slug}
      createPracticeState={createPracticeState}
      isPracticeComplete={(state) =>
        Object.keys(state.interruptionAnswers).length > 0 &&
        Object.values(state.recall).filter((value) => value.trim()).length >= 2
      }
      renderPractice={(practice, state, setState) => (
        <div className="space-y-4">
          <Briefing exercise={practice} availableUntil={0} />
          <Interruption exercise={practice} state={state} setState={setState} />
          <Recall exercise={practice} state={state} setState={setState} />
        </div>
      )}
      renderAssessment={(launch) => <Assessed launch={launch} />}
    />
  );
}
