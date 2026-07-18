"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  Check,
  Headphones,
  Keyboard,
  Loader2,
  LockKeyhole,
  Maximize2,
  Network,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  detectAssessmentDevice,
  type AssessmentDeviceEligibility,
} from "@/lib/assessment-device-eligibility";
import { AssessmentRuntimeClient } from "@/lib/assessment-runtime-client";
import type { AssessmentReadiness, LaunchEnvelope } from "../types";

type Props<TPractice, TPracticeState, TContent> = {
  candidateSessionDocumentId: string;
  slug: string;
  createPracticeState: (practice: TPractice) => TPracticeState;
  isPracticeComplete: (state: TPracticeState) => boolean;
  renderPractice: (
    practice: TPractice,
    state: TPracticeState,
    setState: (state: TPracticeState) => void,
    media: Record<string, { url: string; sha256: string }>,
  ) => ReactNode;
  renderAssessment: (launch: LaunchEnvelope<TContent>) => ReactNode;
};

export function OperationalReadinessPage<TPractice, TPracticeState, TContent>({
  candidateSessionDocumentId,
  slug,
  createPracticeState,
  isPracticeComplete,
  renderPractice,
  renderAssessment,
}: Props<TPractice, TPracticeState, TContent>) {
  const [readiness, setReadiness] =
    useState<AssessmentReadiness<TPractice> | null>(null);
  const [practiceState, setPracticeState] = useState<TPracticeState | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [audioReady, setAudioReady] = useState(false);
  const [deviceEligibility, setDeviceEligibility] =
    useState<AssessmentDeviceEligibility | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [launch, setLaunch] = useState<LaunchEnvelope<TContent> | null>(null);

  useEffect(() => {
    let active = true;
    AssessmentRuntimeClient.readiness<TPractice>(candidateSessionDocumentId, slug)
      .then((data) => {
        if (!active) return;
        setReadiness(data);
        setPracticeState(createPracticeState(data.practice));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadingError(error instanceof Error ? error.message : "Readiness could not be loaded");
      });
    return () => {
      active = false;
    };
  }, [candidateSessionDocumentId, createPracticeState, slug]);

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

  useEffect(() => {
    setDeviceEligibility(detectAssessmentDevice());
  }, []);

  const needsAudio = readiness?.checks.includes("audio-output") ?? false;
  const fullscreenSupported = typeof document !== "undefined" && Boolean(document.fullscreenEnabled);
  const practiceComplete = practiceState !== null && isPracticeComplete(practiceState);
  const checksComplete =
    deviceEligibility?.supported === true &&
    online &&
    fullscreenSupported &&
    (!needsAudio || audioReady);
  const readyToBegin = checksComplete && practiceComplete;

  const testAudio = useCallback(async () => {
    const AudioContextCtor = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
    const latestDeviceEligibility = detectAssessmentDevice();
    setDeviceEligibility(latestDeviceEligibility);
    if (!latestDeviceEligibility.supported) {
      setLaunchError(latestDeviceEligibility.detail);
      return;
    }
    setLaunching(true);
    setLaunchError(null);
    try {
      await document.documentElement.requestFullscreen();
      setLaunch(await AssessmentRuntimeClient.start<TContent>(
        candidateSessionDocumentId,
        slug,
        crypto.randomUUID(),
      ));
    } catch (error) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      setLaunchError(error instanceof Error ? error.message : "The assessed section could not be started");
    } finally {
      setLaunching(false);
    }
  }, [candidateSessionDocumentId, launching, readyToBegin, slug]);

  const technicalChecks = useMemo(() => [
    {
      label: "Desktop keyboard device",
      detail: deviceEligibility?.detail ?? "Checking device compatibility…",
      ready: deviceEligibility?.supported === true,
      icon: Keyboard,
      action: undefined,
    },
    ...(needsAudio ? [{
      label: "Audio output",
      detail: audioReady ? "Test tone confirmed" : "Play a short test tone",
      ready: audioReady,
      icon: Headphones,
      action: testAudio,
    }] : []),
    {
      label: "Network",
      detail: online ? "Connection available" : "No network connection",
      ready: online,
      icon: Network,
      action: undefined,
    },
    {
      label: "Fullscreen",
      detail: fullscreenSupported ? "Supported by this browser" : "Not available",
      ready: fullscreenSupported,
      icon: Maximize2,
      action: undefined,
    },
  ], [audioReady, deviceEligibility, fullscreenSupported, needsAudio, online, testAudio]);

  if (launch) return renderAssessment(launch);
  if (loadingError) return (
    <main className="mx-auto max-w-3xl p-6">
      <div role="alert" className="border border-destructive/40 bg-destructive/10 p-5 text-foreground">
        <h1 className="font-semibold">Assessment unavailable</h1>
        <p className="mt-2 text-sm">{loadingError}</p>
      </div>
    </main>
  );
  if (!readiness || practiceState === null) return (
    <main className="grid min-h-[70vh] place-items-center bg-background text-foreground">
      <p className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        Loading assessment preparation…
      </p>
    </main>
  );

  const readinessSteps = [
    { label: "Read the brief", complete: true },
    { label: "Check your setup", complete: checksComplete },
    { label: "Complete practice", complete: practiceComplete },
    { label: "Begin assessment", complete: false },
  ];

  return (
    <main id="main-content" className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Assessment preparation
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                {readiness.module.title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                {readiness.module.description}
              </p>
            </div>
            <dl className="grid grid-cols-3 divide-x divide-border border border-border bg-background text-sm">
              <div className="px-4 py-3">
                <dt className="text-xs text-muted-foreground">Duration</dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {readiness.module.durationMinutes.minimum}–{readiness.module.durationMinutes.maximum} min
                </dd>
              </div>
              <div className="px-4 py-3">
                <dt className="text-xs text-muted-foreground">Release</dt>
                <dd className="mt-1 font-semibold tabular-nums">{readiness.module.releaseVersion}</dd>
              </div>
              <div className="px-4 py-3">
                <dt className="text-xs text-muted-foreground">Delivery</dt>
                <dd className="mt-1 font-semibold capitalize">
                  {readiness.delivery.deliveryVariant.replaceAll("-", " ")}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </header>

      <div className="border-b border-border bg-muted/30">
        <ol className="mx-auto grid max-w-7xl grid-cols-2 px-5 sm:grid-cols-4 sm:px-8" aria-label="Preparation steps">
          {readinessSteps.map((step, index) => {
            const active = !step.complete && (index === 0 || readinessSteps[index - 1].complete);
            return (
              <li key={step.label} className="flex min-h-16 items-center gap-3 border-r border-border px-3 first:border-l sm:px-5" aria-current={active ? "step" : undefined}>
                <span className={`grid h-7 w-7 shrink-0 place-items-center border text-xs font-semibold ${step.complete ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
                  {step.complete ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
                </span>
                <span className={`text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <section className="border border-border bg-card" aria-labelledby="brief-title">
            <div className="border-b border-border px-5 py-4">
              <h2 id="brief-title" className="text-base font-semibold">What to expect</h2>
            </div>
            <ul className="grid gap-px bg-border sm:grid-cols-2">
              {readiness.instructions.map((instruction) => (
                <li key={instruction} className="flex gap-3 bg-card p-4 text-sm leading-6">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{instruction}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="practice-title">
            <div className="mb-3 flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Unscored</p>
                <h2 id="practice-title" className="mt-1 text-xl font-semibold">Practice workspace</h2>
              </div>
              <p className="max-w-xl text-sm text-muted-foreground">
                Monitoring and assessed time begin only after you launch the assessed section.
              </p>
            </div>
            {deviceEligibility === null ? (
              <div className="flex min-h-40 items-center justify-center border border-border bg-card p-5 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Checking device compatibility…
              </div>
            ) : deviceEligibility.supported ? (
              renderPractice(readiness.practice, practiceState, setPracticeState, readiness.media)
            ) : (
              <div
                className="border border-destructive/40 bg-destructive/10 p-5"
                role="alert"
              >
                <div className="flex gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
                  <div>
                    <h3 className="font-semibold">This device cannot run an assessment</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {deviceEligibility.detail} Practice and assessed content remain locked on this device.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      No assessed attempt has started. Open this session on the supported device and reload the page.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-5 lg:self-start" aria-label="Readiness status">
          <section className="border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Technical readiness</h2>
            </div>
            <div className="divide-y divide-border">
              {technicalChecks.map(({ label, detail, ready, icon: Icon, action }) => (
                <div key={label} className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p>
                    </div>
                    <span className={ready ? "text-primary" : "text-muted-foreground"} aria-label={ready ? "Ready" : "Not ready"}>
                      {ready ? <Check className="h-4 w-4" aria-hidden="true" /> : "—"}
                    </span>
                  </div>
                  {action && !ready ? (
                    <Button type="button" variant="outline" size="sm" className="mt-3 min-h-10 w-full rounded-sm" onClick={action}>
                      Play test tone
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="border border-border bg-card p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              Assessed section
            </h2>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
              {readiness.requirements.map((item) => <li key={item}>• {item}</li>)}
            </ul>
            {deviceEligibility?.supported && !practiceComplete ? (
              <p className="mt-4 flex gap-2 border border-warning/40 bg-warning/10 p-3 text-xs leading-5 text-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Complete the practice exercise to unlock the assessment.
              </p>
            ) : null}
            {deviceEligibility && !deviceEligibility.supported ? (
              <p className="mt-4 flex gap-2 border border-destructive/40 bg-destructive/10 p-3 text-xs leading-5 text-foreground" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                Assessment launch is unavailable on mobile and touch-capable devices.
              </p>
            ) : null}
            {launchError ? <p className="mt-4 text-sm text-destructive" role="alert">{launchError}</p> : null}
            <Button
              type="button"
              size="lg"
              className="mt-4 min-h-12 w-full rounded-sm"
              disabled={!readyToBegin || launching}
              onClick={begin}
            >
              {launching ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <LockKeyhole className="h-4 w-4" aria-hidden="true" />}
              {launching ? "Starting securely…" : "Begin assessed section"}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {readiness.support.label}: <a className="underline underline-offset-4" href={`mailto:${readiness.support.email}`}>{readiness.support.email}</a>
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
