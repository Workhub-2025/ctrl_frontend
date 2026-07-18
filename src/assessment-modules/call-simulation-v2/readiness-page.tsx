"use client";

import { useCallback } from "react";
import { Check, Headphones } from "lucide-react";
import { IncidentWorkspace, type CallResponse, type CallScenario } from "./incident-workspace";
import { OperationalReadinessPage } from "../shared/operational-readiness-page";
import { TrackedAssessmentShell } from "../shared/tracked-assessment-shell";
import type { LaunchEnvelope } from "../types";

type Content = { scenarios: CallScenario[] };
type State = { responses: Record<string, CallResponse>; audioComplete: boolean };

function responseFor(scenario: CallScenario): CallResponse {
  return { scenarioId: scenario.id, fields: {}, fieldTimings: {} };
}

function Assessed({ launch }: { launch: LaunchEnvelope<Content> }) {
  const scenario = launch.content.scenarios[0];
  return (
    <TrackedAssessmentShell<Content, State>
      launch={launch}
      title="Call Simulation Assessment"
      restartNoun="call scenario"
      initialState={() => ({ responses: { [scenario.id]: responseFor(scenario) }, audioComplete: false })}
      validateStage={(stage, state) => stage === 1 && !state.audioComplete ? "Listen to the full caller audio before opening review." : null}
      buildSubmission={(state, elapsedSeconds) => ({
        scenarios: [{ ...state.responses[scenario.id], elapsedSeconds }],
      })}
      continueLabel={(stage) => stage === 0 ? "Open live call record" : "Review call record"}
      renderStage={({ stageIndex, state, setState }) => {
        if (stageIndex === 0) return (
          <section className="border border-border bg-card p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Monitoring active</p>
            <h1 className="mt-2 text-2xl font-semibold">One complete operational record</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              Listen to the recorded call and capture caller, system, intelligence and incident information while it is available. Meaning and operational usability matter more than cosmetic formatting.
            </p>
            <div className="mt-5 flex items-start gap-3 border border-border bg-muted/20 p-4 text-sm leading-6">
              <Headphones className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              The caller audio plays once during the record. Field timing is measured against the playback position using the scenario&apos;s earliest scoring points.
            </div>
          </section>
        );
        if (stageIndex === 1) return (
          <IncidentWorkspace
            scenario={scenario}
            media={launch.media}
            value={state.responses[scenario.id]}
            onChange={(response) => setState({ ...state, responses: { [scenario.id]: response } })}
            onPlaybackChange={(status) => setState({ ...state, audioComplete: status === "complete" })}
          />
        );
        const response = state.responses[scenario.id];
        const completed = scenario.fields.filter((field) => response.fields[field.id]?.trim()).length;
        return (
          <section className="border border-border bg-card p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Final review</p>
            <h1 className="mt-2 text-2xl font-semibold">Submit the call record</h1>
            <div className="mt-5 flex items-center gap-4 border-y border-border py-4">
              <span className="grid h-10 w-10 place-items-center bg-primary/10 text-primary"><Check className="h-5 w-5" aria-hidden="true" /></span>
              <div><p className="font-semibold tabular-nums">{completed} of {scenario.fields.length} fields complete</p><p className="text-sm text-muted-foreground">The record is scored after submission; no immediate result is shown.</p></div>
            </div>
          </section>
        );
      }}
    />
  );
}

export function CallSimulationReadinessPage({ candidateSessionDocumentId, slug }: { candidateSessionDocumentId: string; slug: string }) {
  const createPracticeState = useCallback((practice: CallScenario): State => ({ responses: { [practice.id]: responseFor(practice) }, audioComplete: false }), []);
  return (
    <OperationalReadinessPage<CallScenario, State, Content>
      candidateSessionDocumentId={candidateSessionDocumentId}
      slug={slug}
      createPracticeState={createPracticeState}
      isPracticeComplete={(state) => {
        const response = Object.values(state.responses)[0];
        return Boolean(response && Object.values(response.fields).filter((value) => value.trim()).length >= 3);
      }}
      renderPractice={(practice, state, setState, media) => (
        <IncidentWorkspace
          practice
          scenario={practice}
          media={media}
          value={state.responses[practice.id]}
          onChange={(response) => setState({ ...state, responses: { [practice.id]: response } })}
        />
      )}
      renderAssessment={(launch) => <Assessed launch={launch} />}
    />
  );
}
