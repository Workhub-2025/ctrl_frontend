"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  Headphones,
  Loader2,
  LockKeyhole,
  Maximize2,
  Network,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssessmentRuntimeClient } from "@/lib/assessment-runtime-client";
import type { AssessmentReadiness, LaunchEnvelope } from "../types";
import {
  emptyIncidentResponse,
  IncidentWorkspace,
  type IncidentResponse,
} from "./incident-workspace";
import { TrackedCallSimulation } from "./tracked-call-simulation";

type Props = { candidateSessionDocumentId: string; slug: string };

export function CallSimulationReadinessPage({
  candidateSessionDocumentId,
  slug,
}: Props) {
  const [readiness, setReadiness] = useState<AssessmentReadiness<
    import("../types").CallSimulationScenario
  > | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [practice, setPractice] = useState<IncidentResponse | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [launch, setLaunch] = useState<LaunchEnvelope<{
    scenarios: import("../types").CallSimulationScenario[];
  }> | null>(null);

  useEffect(() => {
    let active = true;
    AssessmentRuntimeClient.readiness<
      import("../types").CallSimulationScenario
    >(candidateSessionDocumentId, slug)
      .then((data) => {
        if (!active) return;
        setReadiness(data);
        setPractice(emptyIncidentResponse(data.practice.id));
      })
      .catch(
        (error: unknown) =>
          active &&
          setLoadingError(
            error instanceof Error
              ? error.message
              : "Readiness could not be loaded",
          ),
      );
    return () => {
      active = false;
    };
  }, [candidateSessionDocumentId, slug]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const practiceComplete = Boolean(
    practice?.actionId &&
    practice.classification &&
    practice.incidentType &&
    practice.resourceDecision &&
    practice.handover.trim(),
  );
  const fullscreenSupported =
    typeof document !== "undefined" && Boolean(document.fullscreenEnabled);
  const readyToBegin =
    audioReady && online && fullscreenSupported && practiceComplete;

  const testAudio = useCallback(async () => {
    const AudioContextCtor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 620;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.35);
    await new Promise((resolve) => setTimeout(resolve, 450));
    await context.close();
    setAudioReady(true);
  }, []);

  const begin = useCallback(async () => {
    if (!readyToBegin || launching) return;
    setLaunching(true);
    setLaunchError(null);
    try {
      await document.documentElement.requestFullscreen();
      const envelope = await AssessmentRuntimeClient.start<{
        scenarios: import("../types").CallSimulationScenario[];
      }>(candidateSessionDocumentId, slug, crypto.randomUUID());
      setLaunch(envelope);
    } catch (error) {
      if (document.fullscreenElement)
        await document.exitFullscreen().catch(() => undefined);
      setLaunchError(
        error instanceof Error
          ? error.message
          : "The assessed section could not be started",
      );
    } finally {
      setLaunching(false);
    }
  }, [candidateSessionDocumentId, launching, readyToBegin, slug]);

  const checks = useMemo(
    () => [
      {
        label: "Audio output",
        detail: audioReady ? "Test tone confirmed" : "Play a short test tone",
        ready: audioReady,
        icon: Headphones,
        action: testAudio,
      },
      {
        label: "Network",
        detail: online ? "Connection available" : "No network connection",
        ready: online,
        icon: Network,
      },
      {
        label: "Fullscreen",
        detail: fullscreenSupported
          ? "Supported by this browser"
          : "Not available",
        ready: fullscreenSupported,
        icon: Maximize2,
      },
    ],
    [audioReady, fullscreenSupported, online, testAudio],
  );

  if (launch) return <TrackedCallSimulation launch={launch} />;
  if (loadingError)
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div
          role="alert"
          className="border-l-4 border-destructive bg-destructive/10 p-5 text-foreground"
        >
          <h1 className="font-semibold">Assessment unavailable</h1>
          <p className="mt-2">{loadingError}</p>
        </div>
      </main>
    );
  if (!readiness || !practice)
    return (
      <main className="grid min-h-[70vh] place-items-center">
        <p className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />{" "}
          Loading readiness checks…
        </p>
      </main>
    );

  return (
    <main
      id="main-content"
      className="min-h-screen bg-muted text-foreground  "
    >
      <header className="border-b border-border bg-background text-foreground">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            CTRL assessment readiness
          </p>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            {readiness.module.title}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
            {readiness.module.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span>
              {readiness.module.durationMinutes.minimum}–
              {readiness.module.durationMinutes.maximum} minutes assessed
            </span>
            <span>Release {readiness.module.releaseVersion}</span>
            <span className="capitalize">
              {readiness.delivery.deliveryVariant.replaceAll("-", " ")}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-7 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-7">
          <section
            className="border border-border bg-card p-6  "
            aria-labelledby="before-title"
          >
            <h2 id="before-title" className="text-xl font-semibold">
              Before you begin
            </h2>
            <ul className="mt-4 space-y-3">
              {readiness.instructions.map((instruction) => (
                <li key={instruction} className="flex gap-3 text-sm leading-6">
                  <Check
                    className="mt-1 h-4 w-4 shrink-0 text-primary "
                    aria-hidden="true"
                  />
                  {instruction}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="practice-title">
            <div className="mb-4 border-l-4 border-primary bg-primary/10 p-4  ">
              <h2 id="practice-title" className="font-semibold">
                Practice workspace
              </h2>
              <p className="mt-1 text-sm leading-6">
                This exercise is unscored. Monitoring and assessed elapsed time
                have not started.
              </p>
            </div>
            <IncidentWorkspace
              scenario={readiness.practice}
              media={readiness.media}
              value={practice}
              onChange={setPractice}
              practice
            />
          </section>
        </div>

        <aside
          className="space-y-5 lg:sticky lg:top-6 lg:self-start"
          aria-label="Readiness status"
        >
          <section className="border border-border bg-card p-5  ">
            <h2 className="mb-4 text-base font-semibold">Technical checks</h2>
            <div className="space-y-3">
              {checks.map(({ label, detail, ready, icon: Icon, action }) => (
                <div
                  key={label}
                  className="border border-border p-3 "
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="text-xs leading-5 text-muted-foreground ">
                        {detail}
                      </p>
                    </div>
                    <span
                      className={
                        ready
                          ? "text-primary "
                          : "text-muted-foreground"
                      }
                      aria-label={ready ? "Ready" : "Not ready"}
                    >
                      {ready ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <span aria-hidden="true">—</span>
                      )}
                    </span>
                  </div>
                  {action && !ready ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={action}
                    >
                      Play test tone
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="border border-border bg-card p-5  ">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" /> Assessed
              section
            </h2>
            <p className="text-sm leading-6 text-muted-foreground ">
              Fullscreen is requested first. The server creates an attempt only
              after fullscreen succeeds.
            </p>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground ">
              {readiness.requirements.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            {!practiceComplete ? (
              <p className="mt-4 flex gap-2 text-sm text-foreground ">
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />{" "}
                Complete the practice record first.
              </p>
            ) : null}
            {launchError ? (
              <p
                className="mt-4 text-sm text-foreground "
                role="alert"
              >
                {launchError}
              </p>
            ) : null}
            <Button
              type="button"
              size="lg"
              className="mt-5 min-h-12 w-full rounded-none bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!readyToBegin || launching}
              onClick={begin}
            >
              {launching ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />{" "}
                  Starting securely…
                </>
              ) : (
                <>
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" /> Begin
                  assessed section
                </>
              )}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {readiness.support.label}:{" "}
              <a
                className="underline"
                href={`mailto:${readiness.support.email}`}
              >
                {readiness.support.email}
              </a>
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
