"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Check, Headphones, Play, Radio } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MediaReference } from "../types";

export type CallField = {
  id: string;
  label: string;
  section: "caller" | "system" | "intelligence" | "incident";
  inputMode?: "text" | "tel";
  control?: "text" | "select" | "textarea";
  options?: string[];
};

export type CallScenario = {
  id: string;
  title: string;
  mediaId: string;
  context: string;
  fields: CallField[];
};

export type CallResponse = {
  scenarioId: string;
  fields: Record<string, string>;
  fieldTimings: Record<string, number>;
  elapsedSeconds?: number;
};

const sectionMeta = [
  { id: "caller", label: "Caller" },
  { id: "system", label: "System" },
  { id: "intelligence", label: "Intelligence" },
  { id: "incident", label: "Incident" },
] as const;

export function IncidentWorkspace({
  scenario,
  media,
  value,
  onChange,
  onPlaybackChange,
  practice = false,
  audioAlreadyComplete = false,
}: {
  scenario: CallScenario;
  media: Record<string, MediaReference>;
  value: CallResponse;
  onChange: (response: CallResponse) => void;
  onPlaybackChange?: (status: "idle" | "live" | "complete") => void;
  practice?: boolean;
  /** When true (e.g. resumed after save), skip single-play gate. */
  audioAlreadyComplete?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playback, setPlayback] = useState<"idle" | "live" | "complete">(
    audioAlreadyComplete ? "complete" : "idle",
  );

  useEffect(() => {
    if (audioAlreadyComplete) onPlaybackChange?.("complete");
    // Notify parent once when resumed with completed audio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioAlreadyComplete]);
  const availableSections = sectionMeta.filter((section) => scenario.fields.some((field) => field.section === section.id));
  const [section, setSection] = useState<string>(availableSections[0]?.id ?? "caller");
  const completed = useMemo(() => scenario.fields.filter((field) => value.fields[field.id]?.trim()).length, [scenario.fields, value.fields]);
  const mediaItem = media[scenario.mediaId];
  const startCall = async () => {
    if (!audioRef.current || playback !== "idle") return;
    try {
      await audioRef.current.play();
      setPlayback("live");
      onPlaybackChange?.("live");
    } catch {
      setPlayback("idle");
    }
  };

  const updateField = (field: CallField, nextValue: string) => {
    onChange({
      ...value,
      fields: { ...value.fields, [field.id]: nextValue },
      fieldTimings: {
        ...value.fieldTimings,
        [field.id]: Math.round((audioRef.current?.currentTime ?? 0) * 100) / 100,
      },
    });
  };

  return (
    <section className="grid min-h-[560px] border border-border bg-card lg:grid-cols-[320px_minmax(0,1fr)]" aria-labelledby={`${scenario.id}-title`}>
      <aside className="border-b border-border bg-muted/20 p-5 lg:sticky lg:top-[113px] lg:h-[calc(100vh-145px)] lg:self-start lg:border-b-0 lg:border-r">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{practice ? "Unscored practice" : "Live call"}</p>
        <h1 id={`${scenario.id}-title`} className="mt-2 text-xl font-semibold">{scenario.title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{scenario.context}</p>

        <div className="mt-5 border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><Headphones className="h-4 w-4 text-primary" aria-hidden="true" /> Caller audio</div>
          {mediaItem ? practice ? (
            <audio ref={audioRef} className="mt-3 w-full" controls preload="metadata">
              <source src={mediaItem.url} />
              Your browser does not support the audio element.
            </audio>
          ) : (
            <div className="mt-3">
              <audio ref={audioRef} preload="metadata" onEnded={() => { setPlayback("complete"); onPlaybackChange?.("complete"); }}>
                <source src={mediaItem.url} />
                Your browser does not support the audio element.
              </audio>
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-border bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                disabled={playback !== "idle"}
                onClick={() => void startCall()}
              >
                {playback === "idle" ? <Play className="h-4 w-4" aria-hidden="true" /> : <Radio className="h-4 w-4" aria-hidden="true" />}
                {playback === "idle" ? "Start caller audio" : playback === "live" ? "Call in progress" : "Call audio complete"}
              </button>
            </div>
          ) : (
            <p role="alert" className="mt-3 text-sm text-destructive">Audio could not be loaded.</p>
          )}
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {practice
              ? "Use the controls freely while learning the workspace."
              : "The assessed call plays once without pause or replay. Field timing is recorded against the live playback position."}
          </p>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Record completion</span><span className="font-semibold tabular-nums text-foreground">{completed}/{scenario.fields.length}</span></div>
          <div className="mt-2 h-1.5 bg-muted" role="progressbar" aria-label="Record completion" aria-valuemin={0} aria-valuemax={scenario.fields.length} aria-valuenow={completed}>
            <div className="h-full bg-primary" style={{ width: `${scenario.fields.length ? completed / scenario.fields.length * 100 : 0}%` }} />
          </div>
        </div>
      </aside>

      <div className="min-w-0 p-5 sm:p-6">
        <Tabs value={section} onValueChange={setSection}>
          <TabsList className="grid h-auto w-full rounded-sm border border-border bg-muted/30 p-0" style={{ gridTemplateColumns: `repeat(${availableSections.length}, minmax(0, 1fr))` }} aria-label="Call record sections">
            {availableSections.map((item) => {
              const fields = scenario.fields.filter((field) => field.section === item.id);
              const sectionComplete = fields.filter((field) => value.fields[field.id]?.trim()).length;
              return (
                <TabsTrigger key={item.id} value={item.id} className="min-h-12 rounded-none border-r border-border px-2 text-xs shadow-none last:border-r-0 data-[state=active]:bg-card data-[state=active]:shadow-none sm:text-sm">
                  <span>{item.label}</span>
                  {sectionComplete === fields.length ? <Check className="ml-2 h-3.5 w-3.5 text-primary" aria-label="Complete" /> : <span className="ml-2 tabular-nums text-muted-foreground">{sectionComplete}/{fields.length}</span>}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {availableSections.map((item) => {
            const fields = scenario.fields.filter((field) => field.section === item.id);
            return (
              <TabsContent key={item.id} value={item.id} className="mt-5 border-0 focus-visible:ring-offset-4">
                <div className="mb-5 border-b border-border pb-3">
                  <h2 className="text-lg font-semibold">{item.label} information</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Record only information supported by the call.</p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  {fields.map((field) => (
                    <label key={field.id} className={field.control === "textarea" ? "text-sm font-semibold sm:col-span-2" : "text-sm font-semibold"}>
                      {field.label}
                      {field.control === "select" ? (
                        <select
                          className="mt-2 min-h-11 w-full rounded-sm border border-border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={value.fields[field.id] ?? ""}
                          disabled={!practice && playback === "idle"}
                          onChange={(event) => updateField(field, event.target.value)}
                        >
                          <option value="">Select an option</option>
                          {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      ) : field.control === "textarea" ? (
                        <textarea
                          className="mt-2 min-h-28 w-full rounded-sm border border-border bg-background p-3 font-normal leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={value.fields[field.id] ?? ""}
                          disabled={!practice && playback === "idle"}
                          maxLength={2_000}
                          onChange={(event) => updateField(field, event.target.value)}
                        />
                      ) : (
                        <input
                          className="mt-2 min-h-11 w-full rounded-sm border border-border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          inputMode={field.inputMode}
                          value={value.fields[field.id] ?? ""}
                          disabled={!practice && playback === "idle"}
                          maxLength={200}
                          onChange={(event) => updateField(field, event.target.value)}
                        />
                      )}
                    </label>
                  ))}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </section>
  );
}
