"use client";

import { useId } from "react";
import { AlertTriangle, CheckCircle2, Headphones, Radio } from "lucide-react";
import type { CallSimulationScenario, MediaReference } from "../types";

export type IncidentResponse = {
  scenarioId: string;
  fields: Record<string, string>;
  actionId: string;
  classification: string;
  incidentType: string;
  resourceDecision: string;
  handover: string;
  elapsedSeconds: number;
};

export function emptyIncidentResponse(scenarioId: string): IncidentResponse {
  return {
    scenarioId,
    fields: {},
    actionId: "",
    classification: "",
    incidentType: "",
    resourceDecision: "",
    handover: "",
    elapsedSeconds: 0,
  };
}

type Props = {
  scenario: CallSimulationScenario;
  media: Record<string, MediaReference>;
  value: IncidentResponse;
  onChange: (value: IncidentResponse) => void;
  practice?: boolean;
};

export function IncidentWorkspace({
  scenario,
  media,
  value,
  onChange,
  practice = false,
}: Props) {
  const id = useId();
  const selectedAction = scenario.actions.find(
    (action) => action.id === value.actionId,
  );
  const update = (patch: Partial<IncidentResponse>) =>
    onChange({ ...value, ...patch });
  const updateField = (fieldId: string, fieldValue: string) =>
    update({
      fields: { ...value.fields, [fieldId]: fieldValue },
    });

  return (
    <div className="space-y-6">
      <section
        className="border border-border bg-card p-5 shadow-sm  "
        aria-labelledby={`${id}-call-title`}
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4 ">
          <div>
            <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground ">
              <Radio className="h-4 w-4" aria-hidden="true" />{" "}
              {practice ? "Training channel" : "Live incident"}
            </p>
            <h2
              id={`${id}-call-title`}
              className="text-xl font-semibold tracking-tight text-foreground "
            >
              {scenario.title}
            </h2>
          </div>
          <span className="border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground   ">
            {practice ? "Not scored or monitored" : "Assessed"}
          </span>
        </div>
        <p className="mb-4 text-sm leading-6 text-foreground ">
          {scenario.dispatchContext}
        </p>
        <label
          className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground "
          htmlFor={`${id}-base-audio`}
        >
          <Headphones className="h-4 w-4" aria-hidden="true" /> Caller audio
        </label>
        <audio
          id={`${id}-base-audio`}
          className="w-full"
          controls
          preload="metadata"
          src={media[scenario.baseMediaId]?.url}
        >
          Your browser does not support audio playback.
        </audio>
        {scenario.transcripts?.[scenario.baseMediaId] ? (
          <details className="mt-3 border-l-4 border-border bg-muted/50 p-3 text-sm  ">
            <summary className="cursor-pointer font-semibold">
              Approved audio transcript
            </summary>
            <p className="mt-2 leading-6">
              {scenario.transcripts[scenario.baseMediaId]}
            </p>
          </details>
        ) : null}
      </section>

      <section
        className="border border-border bg-card p-5  "
        aria-labelledby={`${id}-capture-title`}
      >
        <h3
          id={`${id}-capture-title`}
          className="mb-1 text-base font-semibold text-foreground "
        >
          Incident record
        </h3>
        <p className="mb-4 text-sm text-muted-foreground ">
          Capture details while audio is available. Use concise operational
          language.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {scenario.captureFields.map((field) => (
            <div key={field.id}>
              <label
                className="mb-1.5 block text-sm font-medium text-foreground "
                htmlFor={`${id}-${field.id}`}
              >
                {field.label}
              </label>
              <input
                id={`${id}-${field.id}`}
                type={field.inputMode === "tel" ? "tel" : "text"}
                value={value.fields[field.id] ?? ""}
                onChange={(event) => updateField(field.id, event.target.value)}
                className="min-h-11 w-full border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30   "
                autoComplete="off"
              />
            </div>
          ))}
        </div>
      </section>

      <fieldset className="border border-border bg-card p-5  ">
        <legend className="px-1 text-base font-semibold text-foreground ">
          Follow-up action
        </legend>
        <p className="mb-4 text-sm text-muted-foreground ">
          {scenario.actionPrompt}
        </p>
        <div className="space-y-2">
          {scenario.actions.map((action) => (
            <label
              key={action.id}
              className="flex min-h-12 cursor-pointer items-start gap-3 border border-border p-3 hover:border-border has-[:checked]:border-primary has-[:checked]:bg-primary/10 "
            >
              <input
                type="radio"
                name={`${id}-action`}
                value={action.id}
                checked={value.actionId === action.id}
                onChange={() => update({ actionId: action.id })}
                className="mt-1 h-4 w-4"
              />
              <span className="text-sm font-medium leading-6">
                {action.label}
              </span>
            </label>
          ))}
        </div>
        {selectedAction ? (
          <div
            className="mt-4 border-l-4 border-warning bg-warning/10 p-4 "
            aria-live="polite"
          >
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Caller
              response
            </p>
            <audio
              controls
              preload="metadata"
              className="w-full"
              src={media[selectedAction.branchMediaId]?.url}
            >
              Your browser does not support audio playback.
            </audio>
            <p className="mt-2 text-sm leading-6">
              {selectedAction.branchSummary}
            </p>
            {scenario.transcripts?.[selectedAction.branchMediaId] ? (
              <p className="mt-2 text-sm">
                <strong>Transcript:</strong>{" "}
                {scenario.transcripts[selectedAction.branchMediaId]}
              </p>
            ) : null}
          </div>
        ) : null}
      </fieldset>

      <section
        className="grid gap-4 border border-border bg-card p-5   md:grid-cols-3"
        aria-labelledby={`${id}-decision-title`}
      >
        <h3
          id={`${id}-decision-title`}
          className="md:col-span-3 text-base font-semibold"
        >
          Operational decision
        </h3>
        {[
          [
            "Risk classification",
            "classification",
            scenario.classificationOptions,
          ],
          ["Incident type", "incidentType", scenario.incidentTypeOptions],
          [
            "Response and resource",
            "resourceDecision",
            scenario.resourceOptions,
          ],
        ].map(([label, key, options]) => (
          <div key={key as string}>
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor={`${id}-${key}`}
            >
              {label as string}
            </label>
            <select
              id={`${id}-${key}`}
              className="min-h-11 w-full border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  "
              value={
                value[
                  key as "classification" | "incidentType" | "resourceDecision"
                ]
              }
              onChange={(event) =>
                update({ [key as string]: event.target.value })
              }
            >
              <option value="">Select an option</option>
              {(options as string[]).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ))}
      </section>

      <section
        className="border border-border bg-card p-5  "
        aria-labelledby={`${id}-handover-title`}
      >
        <h3
          id={`${id}-handover-title`}
          className="mb-1 text-base font-semibold"
        >
          Handover record
        </h3>
        <label
          className="mb-2 block text-sm text-muted-foreground "
          htmlFor={`${id}-handover`}
        >
          Summarise what is happening, where, who is at risk, key intelligence
          and the response required.
        </label>
        <textarea
          id={`${id}-handover`}
          rows={5}
          value={value.handover}
          onChange={(event) => update({ handover: event.target.value })}
          className="w-full border border-border bg-card p-3 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  "
        />
        {practice &&
        value.actionId &&
        value.classification &&
        value.incidentType &&
        value.resourceDecision &&
        value.handover.trim() ? (
          <p
            className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary "
            role="status"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Practice
            record complete
          </p>
        ) : null}
      </section>
    </div>
  );
}
