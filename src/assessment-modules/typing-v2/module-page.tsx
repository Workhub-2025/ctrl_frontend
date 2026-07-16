"use client";

import { useCallback } from "react";
import { OperationalReadinessPage } from "../shared/operational-readiness-page";
import { TrackedAssessmentShell } from "../shared/tracked-assessment-shell";
import type { LaunchEnvelope } from "../types";

type Exercise = {
  id: string;
  title: string;
  sourceLabel: string;
  sourceText: string;
  structuredFields: Array<{ id: string; label: string }>;
};
type State = { transcript: string; structured: Record<string, string> };
type Content = { exercise: Exercise };

function EntryWorkspace({
  exercise,
  state,
  setState,
  practice = false,
}: {
  exercise: Exercise;
  state: State;
  setState: (state: State) => void;
  practice?: boolean;
}) {
  return (
    <section className="border border-border bg-card  ">
      <div className="border-b border-border p-5 ">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {practice ? "Unscored practice" : exercise.sourceLabel}
        </p>
        <h1 className="mt-2 text-2xl font-semibold">{exercise.title}</h1>
      </div>
      <div className="grid lg:grid-cols-2">
        <div className="border-b border-border p-6 lg:border-b-0 lg:border-r ">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Source record
          </h2>
          <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-foreground ">
            {exercise.sourceText}
          </p>
        </div>
        <div className="p-6">
          <label className="text-sm font-semibold">
            Operational transcription
            <textarea
              className="mt-2 min-h-64 w-full resize-y border border-border bg-card p-4 font-mono text-sm leading-6 "
              value={state.transcript}
              onChange={(event) =>
                setState({ ...state, transcript: event.target.value })
              }
              spellCheck={false}
            />
          </label>
          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Structured fields
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {exercise.structuredFields.map((field) => (
              <label key={field.id} className="text-sm font-semibold">
                {field.label}
                <input
                  className="mt-2 h-11 w-full border border-border bg-card px-3 font-normal "
                  value={state.structured[field.id] ?? ""}
                  onChange={(event) =>
                    setState({
                      ...state,
                      structured: {
                        ...state.structured,
                        [field.id]: event.target.value,
                      },
                    })
                  }
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Assessed({ launch }: { launch: LaunchEnvelope<Content> }) {
  const exercise = launch.content.exercise;
  return (
    <TrackedAssessmentShell<Content, State>
      launch={launch}
      title="Typing v2"
      restartNoun="operational record"
      initialState={() => ({ transcript: "", structured: {} })}
      validateStage={(stage, state) => {
        if (stage === 1 && state.transcript.trim().length < 80)
          return "Complete the operational transcription before continuing.";
        if (
          stage === 1 &&
          exercise.structuredFields.some(
            (field) => !(state.structured[field.id] ?? "").trim(),
          )
        )
          return "Complete every structured field; use “not stated” where necessary.";
        return null;
      }}
      buildSubmission={(state, elapsedSeconds) => ({
        exerciseId: exercise.id,
        transcript: state.transcript,
        structured: state.structured,
        elapsedSeconds,
      })}
      renderStage={({ stageIndex, state, setState }) => {
        if (stageIndex === 0)
          return (
            <section className="border border-border bg-card p-7  ">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                Monitoring active
              </p>
              <h1 className="mt-2 text-2xl font-semibold">
                Operational transcription briefing
              </h1>
              <p className="mt-4 max-w-3xl leading-7 text-foreground ">
                Transcribe the source record and complete its structured fields.
                Accuracy of names, locations, access routes and callback details
                matters more than raw speed. Clipboard actions are disabled.
              </p>
            </section>
          );
        if (stageIndex === 1)
          return (
            <EntryWorkspace
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
              Submit the operational entry
            </h1>
            <dl className="mt-5 grid gap-4 border-y border-border py-4 text-sm sm:grid-cols-2 ">
              <div>
                <dt className="text-muted-foreground">Transcribed words</dt>
                <dd className="mt-1 text-xl font-semibold">
                  {state.transcript.trim().split(/\s+/).filter(Boolean).length}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Structured fields complete</dt>
                <dd className="mt-1 text-xl font-semibold">
                  {
                    Object.values(state.structured).filter((value) =>
                      value.trim(),
                    ).length
                  }{" "}
                  / {exercise.structuredFields.length}
                </dd>
              </div>
            </dl>
            <p className="mt-5 text-sm leading-6 text-muted-foreground ">
              Submission is final. The candidate portal will show a receipt
              only.
            </p>
          </section>
        );
      }}
    />
  );
}

export function TypingModulePage({
  candidateSessionDocumentId,
  slug,
}: {
  candidateSessionDocumentId: string;
  slug: string;
}) {
  const createPracticeState = useCallback(
    (): State => ({ transcript: "", structured: {} }),
    [],
  );
  return (
    <OperationalReadinessPage<Exercise, State, Content>
      candidateSessionDocumentId={candidateSessionDocumentId}
      slug={slug}
      createPracticeState={createPracticeState}
      isPracticeComplete={(state) =>
        state.transcript.trim().length >= 20 &&
        Object.values(state.structured).filter((value) => value.trim())
          .length >= 2
      }
      renderPractice={(practice, state, setState) => (
        <EntryWorkspace
          practice
          exercise={practice}
          state={state}
          setState={setState}
        />
      )}
      renderAssessment={(launch) => <Assessed launch={launch} />}
    />
  );
}
