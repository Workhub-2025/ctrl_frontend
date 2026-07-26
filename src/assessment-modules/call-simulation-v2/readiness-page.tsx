"use client";

import { useCallback, useEffect, useRef } from "react";
import { Check, Headphones } from "lucide-react";
import { IncidentWorkspace, type CallResponse, type CallScenario } from "./incident-workspace";
import { OperationalReadinessPage } from "../shared/operational-readiness-page";
import { TrackedAssessmentShell } from "../shared/tracked-assessment-shell";
import type { LaunchEnvelope } from "../types";

type Content = { scenarios: CallScenario[] };
type State = {
  responses: Record<string, CallResponse>;
  audioComplete: Record<string, boolean>;
  scenarioStartedAt: Record<string, number>;
};

function responseFor(scenario: CallScenario): CallResponse {
  return { scenarioId: scenario.id, fields: {}, fieldTimings: {}, elapsedSeconds: 0 };
}

function Assessed({ launch }: { launch: LaunchEnvelope<Content> }) {
  const scenarios = launch.content.scenarios;
  const captureCount = scenarios.length;
  const reviewStage = 1 + captureCount;

  return (
    <TrackedAssessmentShell<Content, State>
      launch={launch}
      title="Call Simulation Assessment"
      restartNoun="call scenario"
      initialState={() => ({
        responses: Object.fromEntries(
          scenarios.map((scenario) => [scenario.id, responseFor(scenario)]),
        ),
        audioComplete: Object.fromEntries(
          scenarios.map((scenario) => [scenario.id, false]),
        ),
        scenarioStartedAt: Object.fromEntries(
          scenarios.map((scenario) => [scenario.id, 0]),
        ),
      })}
      validateStage={(stage, state) => {
        if (stage >= 1 && stage <= captureCount) {
          const scenario = scenarios[stage - 1];
          if (!scenario) return "Call scenario is unavailable.";
          if (!state.audioComplete[scenario.id]) {
            return "Listen to the full caller audio before continuing.";
          }
        }
        return null;
      }}
      buildSubmission={(state) => ({
        scenarios: scenarios.map((scenario) => {
          const response = state.responses[scenario.id];
          const startedAt = state.scenarioStartedAt[scenario.id];
          const elapsedSeconds =
            response.elapsedSeconds ||
            (startedAt
              ? Math.max(1, Math.floor((Date.now() - startedAt) / 1_000))
              : 1);
          return {
            ...response,
            elapsedSeconds,
          };
        }),
      })}
      continueLabel={(stage) => {
        if (stage === 0) return "Open Call 1 record";
        if (stage < captureCount) return `Open Call ${stage + 1} record`;
        if (stage === captureCount) return "Review call records";
        return "Continue";
      }}
      renderStage={({ stageIndex, state, setState }) => {
        if (stageIndex === 0) {
          return (
            <section className="border border-border bg-card p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Monitoring active
              </p>
              <h1 className="mt-2 text-2xl font-semibold">
                {captureCount === 1
                  ? "One complete operational record"
                  : `${captureCount} assessed operational records`}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                Listen to each recorded call and capture caller, system, intelligence and incident
                information while it is available. Meaning and operational usability matter more than
                cosmetic formatting.
              </p>
              <div className="mt-5 flex items-start gap-3 border border-border bg-muted/20 p-4 text-sm leading-6">
                <Headphones className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                Each caller audio plays once during its record. Field timing is measured against the
                playback position using the scenario&apos;s earliest scoring points.
              </div>
            </section>
          );
        }

        if (stageIndex >= 1 && stageIndex <= captureCount) {
          const scenario = scenarios[stageIndex - 1]!;
          return (
            <CallScenarioStage
              scenario={scenario}
              media={launch.media}
              state={state}
              setState={setState}
            />
          );
        }

        if (stageIndex === reviewStage) {
          const completed = scenarios.reduce((total, scenario) => {
            const response = state.responses[scenario.id];
            if (!response) return total;
            return (
              total +
              scenario.fields.filter((field) => response.fields[field.id]?.trim()).length
            );
          }, 0);
          const fieldTotal = scenarios.reduce(
            (total, scenario) => total + scenario.fields.length,
            0,
          );
          return (
            <section className="border border-border bg-card p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Final review
              </p>
              <h1 className="mt-2 text-2xl font-semibold">Submit the call records</h1>
              <div className="mt-5 flex items-center gap-4 border-y border-border py-4">
                <span className="grid h-10 w-10 place-items-center bg-primary/10 text-primary">
                  <Check className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold tabular-nums">
                    {completed} of {fieldTotal} fields complete across {captureCount} call
                    {captureCount === 1 ? "" : "s"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The record is scored after submission; no immediate result is shown.
                  </p>
                </div>
              </div>
            </section>
          );
        }

        return null;
      }}
    />
  );
}

function CallScenarioStage({
  scenario,
  media,
  state,
  setState,
}: {
  scenario: CallScenario;
  media: LaunchEnvelope["media"];
  state: State;
  setState: (state: State) => void;
}) {
  const started = useRef(false);
  useEffect(() => {
    if (started.current || state.scenarioStartedAt[scenario.id]) return;
    started.current = true;
    setState({
      ...state,
      scenarioStartedAt: {
        ...state.scenarioStartedAt,
        [scenario.id]: Date.now(),
      },
    });
  }, [scenario.id, setState, state]);

  const audioAlreadyComplete = Boolean(state.audioComplete[scenario.id]);

  return (
    <IncidentWorkspace
      scenario={scenario}
      media={media}
      audioAlreadyComplete={audioAlreadyComplete}
      value={state.responses[scenario.id]!}
      onChange={(response) => {
        const startedAt = state.scenarioStartedAt[scenario.id] || Date.now();
        setState({
          ...state,
          scenarioStartedAt: {
            ...state.scenarioStartedAt,
            [scenario.id]: startedAt,
          },
          responses: {
            ...state.responses,
            [scenario.id]: {
              ...response,
              elapsedSeconds: Math.max(
                1,
                Math.floor((Date.now() - startedAt) / 1_000),
              ),
            },
          },
        });
      }}
      onPlaybackChange={(status) =>
        setState({
          ...state,
          audioComplete: {
            ...state.audioComplete,
            [scenario.id]:
              status === "complete" || Boolean(state.audioComplete[scenario.id]),
          },
          scenarioStartedAt: {
            ...state.scenarioStartedAt,
            [scenario.id]:
              state.scenarioStartedAt[scenario.id] ||
              (status === "live" ? Date.now() : 0),
          },
        })
      }
    />
  );
}

export function CallSimulationReadinessPage({
  candidateSessionDocumentId,
  slug,
}: {
  candidateSessionDocumentId: string;
  slug: string;
}) {
  const createPracticeState = useCallback(
    (practice: CallScenario): State => ({
      responses: { [practice.id]: responseFor(practice) },
      audioComplete: { [practice.id]: false },
      scenarioStartedAt: { [practice.id]: 0 },
    }),
    [],
  );
  return (
    <OperationalReadinessPage<CallScenario, State, Content>
      candidateSessionDocumentId={candidateSessionDocumentId}
      slug={slug}
      createPracticeState={createPracticeState}
      isPracticeComplete={(state) => {
        const response = Object.values(state.responses)[0];
        return Boolean(
          response && Object.values(response.fields).filter((value) => value.trim()).length >= 3,
        );
      }}
      renderPractice={(practice, state, setState, media) => (
        <IncidentWorkspace
          practice
          scenario={practice}
          media={media}
          value={state.responses[practice.id]!}
          onChange={(response) =>
            setState({ ...state, responses: { [practice.id]: response } })
          }
        />
      )}
      renderAssessment={(launch) => <Assessed launch={launch} />}
    />
  );
}
