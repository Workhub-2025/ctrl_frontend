"use client";

import { useCallback, useEffect, useState } from "react";
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
};
type Content = { exercise: Exercise };

function emptyState(exercise: Exercise, timed: boolean): State {
  return {
    interruptionAnswers: {},
    recall: {},
    sequence: exercise.eventOptions.map(() => ""),
    corrections: {},
    briefingAvailableUntil:
      Date.now() + (timed ? exercise.briefing.displaySeconds * 1_000 : 0),
  };
}

function Briefing({
  exercise,
  availableUntil,
}: {
  exercise: Exercise;
  availableUntil: number;
}) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.ceil((availableUntil - Date.now()) / 1_000)),
  );
  useEffect(() => {
    const timer = window.setInterval(
      () =>
        setRemaining(
          Math.max(0, Math.ceil((availableUntil - Date.now()) / 1_000)),
        ),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [availableUntil]);
  return (
    <section className="border border-slate-300 bg-white p-7 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-700">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            One-time briefing
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            {exercise.briefing.heading}
          </h1>
        </div>
        <div className="border border-slate-400 px-3 py-2 font-mono text-sm">
          {remaining}s
        </div>
      </div>
      <div className="mt-6 space-y-4 text-base leading-8 text-slate-800 dark:text-slate-100">
        {exercise.briefing.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <p className="mt-6 border-l-4 border-slate-700 bg-slate-100 p-4 text-sm dark:bg-slate-800">
        The briefing is removed when you continue. Notes and clipboard actions
        are not available.
      </p>
    </section>
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
    <section className="border border-slate-300 bg-white p-7 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
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
                  className={`cursor-pointer border px-4 py-3 text-sm ${state.interruptionAnswers[task.id] === option.id ? "border-blue-800 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30" : "border-slate-300 dark:border-slate-700"}`}
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
    <section className="border border-slate-300 bg-white p-7 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        Delayed recall
      </p>
      <h1 className="mt-2 text-2xl font-semibold">
        Reconstruct the key operational facts
      </h1>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        Enter only details you remember. Do not invent a missing value.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {exercise.recallFields.map((field) => (
          <label key={field.id} className="text-sm font-semibold">
            {field.label}
            <input
              className="mt-2 h-11 w-full border border-slate-400 bg-white px-3 font-normal dark:bg-slate-950"
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
    <section className="border border-slate-300 bg-white p-7 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
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
            <span className="grid h-8 w-8 shrink-0 place-items-center border border-slate-400">
              {index + 1}
            </span>
            <select
              className="h-11 w-full border border-slate-400 bg-white px-3 font-normal dark:bg-slate-950"
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
    <section className="border border-slate-300 bg-white p-7 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        Record correction
      </p>
      <h1 className="mt-2 text-2xl font-semibold">
        Correct the flawed operational record
      </h1>
      <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-700 dark:border-slate-700">
        {exercise.flawedRecord.map((field) => (
          <div key={field.id} className="grid gap-3 py-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {field.label}
              </p>
              <p className="mt-1 font-medium line-through decoration-red-700">
                {field.value}
              </p>
            </div>
            <label className="text-sm font-semibold">
              Correct value
              <input
                className="mt-2 h-11 w-full border border-slate-400 bg-white px-3 font-normal dark:bg-slate-950"
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
      title="Short-Term Memory v2"
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
            <Briefing
              exercise={exercise}
              availableUntil={state.briefingAvailableUntil}
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
          <section className="border border-slate-300 bg-white p-7 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Final review
            </p>
            <h1 className="mt-2 text-2xl font-semibold">
              Submit the reconstructed record
            </h1>
            <p className="mt-4 leading-7 text-slate-700 dark:text-slate-200">
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
