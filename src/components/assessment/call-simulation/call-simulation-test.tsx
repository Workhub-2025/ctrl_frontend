'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  FileText,
  Loader2,
  LogOut,
  Phone,
  Play,
  Volume2,
} from 'lucide-react';
import { AssessmentGameShell } from '@/components/assessment/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';

type CallRun = {
  id: string;
  title: string;
  kind: 'practice' | 'final';
  audioSrc: string;
};

type CallContentFile = {
  runs: CallRun[];
};

type CallPhase =
  | 'landing'
  | 'rules'
  | 'running'
  | 'practice-results'
  | 'practice-complete'
  | 'submitting'
  | 'submitted';

type IncidentForm = {
  incidentType: string;
  location: string;
  callerName: string;
  callbackNumber: string;
  peopleInvolved: string;
  injuriesRisk: string;
  servicesRequired: string;
  incidentSummary: string;
};

type RunSnapshot = {
  runIndex: number;
  form: IncidentForm;
};

const CONTENT_URL = '/assessment-content/call-simulation.json';
const FINAL_RUN_INDEX = 2;
const REVIEW_SECONDS = 60;

const emptyForm: IncidentForm = {
  incidentType: '',
  location: '',
  callerName: '',
  callbackNumber: '',
  peopleInvolved: '',
  injuriesRisk: '',
  servicesRequired: '',
  incidentSummary: '',
};

const fallbackRuns: CallRun[] = [
  {
    id: 'fallback-practice-1',
    title: 'Practice call 1',
    kind: 'practice',
    audioSrc: '/assets/audio.mp3',
  },
  {
    id: 'fallback-practice-2',
    title: 'Practice call 2',
    kind: 'practice',
    audioSrc: '/assets/audio.mp3',
  },
  {
    id: 'fallback-final',
    title: 'Final call',
    kind: 'final',
    audioSrc: '/assets/audio.mp3',
  },
];

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
};

export default function CallSimulationTest() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const formRef = useRef<IncidentForm>(emptyForm);
  const runIndexRef = useRef(0);
  const isFinalRunRef = useRef(false);
  const [phase, setPhase] = useState<CallPhase>('landing');
  const [runs, setRuns] = useState<CallRun[]>(fallbackRuns);
  const [currentRunIndex, setCurrentRunIndex] = useState(0);
  const [form, setForm] = useState<IncidentForm>(emptyForm);
  const [snapshots, setSnapshots] = useState<RunSnapshot[]>([]);
  const [hasStartedAudio, setHasStartedAudio] = useState(false);
  const [audioEnded, setAudioEnded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [reviewTimeLeft, setReviewTimeLeft] = useState(REVIEW_SECONDS);

  const currentRun = useMemo(() => {
    return runs[currentRunIndex] ?? fallbackRuns[currentRunIndex] ?? fallbackRuns[0];
  }, [currentRunIndex, runs]);
  const isFinalRun = currentRun.kind === 'final';
  const audioProgress =
    audioDuration > 0 ? Math.min((audioCurrentTime / audioDuration) * 100, 100) : 0;
  const latestSnapshot = snapshots[snapshots.length - 1];

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    runIndexRef.current = currentRunIndex;
  }, [currentRunIndex]);

  useEffect(() => {
    isFinalRunRef.current = isFinalRun;
  }, [isFinalRun]);

  useEffect(() => {
    let cancelled = false;

    fetch(CONTENT_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Unable to load call simulation content');
        }
        return response.json() as Promise<CallContentFile>;
      })
      .then((content) => {
        if (!cancelled && Array.isArray(content.runs) && content.runs.length > 0) {
          setRuns(content.runs);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRuns(fallbackRuns);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    audio.load();
    setHasStartedAudio(false);
    setAudioEnded(false);
    setIsPlaying(false);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setReviewTimeLeft(REVIEW_SECONDS);
  }, [currentRun.audioSrc, currentRunIndex]);

  const beginRun = useCallback((runIndex: number) => {
    setCurrentRunIndex(runIndex);
    setForm(emptyForm);
    setReviewTimeLeft(REVIEW_SECONDS);
    setPhase('running');
  }, []);

  const closeAssessment = useCallback(() => {
    router.push('/candidate-dashboard/my-assessments/');
  }, [router]);

  const updateForm = (field: keyof IncidentForm, value: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const playAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    await audio.play();
    setHasStartedAudio(true);
    setIsPlaying(true);
  };

  const handleAudioEnded = () => {
    setAudioEnded(true);
    setIsPlaying(false);
    setReviewTimeLeft(REVIEW_SECONDS);
  };

  const completeRun = useCallback(() => {
    const activeRunIndex = runIndexRef.current;
    const snapshot = {
      runIndex: activeRunIndex,
      form: formRef.current,
    };

    setSnapshots((currentSnapshots) => [...currentSnapshots, snapshot]);

    if (isFinalRunRef.current) {
      setPhase('submitting');
      return;
    }

    if (activeRunIndex === FINAL_RUN_INDEX - 1) {
      setPhase('practice-complete');
      return;
    }

    setPhase('practice-results');
  }, []);

  useEffect(() => {
    if (phase !== 'running' || !audioEnded) return;

    if (reviewTimeLeft <= 0) {
      completeRun();
      return;
    }

    const timerId = window.setTimeout(() => {
      setReviewTimeLeft((currentValue) => Math.max(currentValue - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [audioEnded, completeRun, phase, reviewTimeLeft]);

  useEffect(() => {
    if (phase !== 'submitting') return;

    const timerId = window.setTimeout(() => {
      setPhase('submitted');
    }, 2600);

    return () => window.clearTimeout(timerId);
  }, [phase]);

  return (
    <AssessmentGameShell
      icon={Phone}
      title="Call Simulation"
      eyebrow="CTRL assessment"
      status={phase === 'running' ? currentRun.title : 'Audio incident log'}
    >
      {phase === 'landing' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Phone className="h-8 w-8" />
          </div>
          <p className="max-w-2xl text-2xl font-semibold leading-tight tracking-normal text-foreground sm:text-3xl">
            Call Simulation
          </p>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Listen to the full assessment audio once, then complete a structured
            incident log from the information you hear. The opening audio will
            explain more about how the assessment works.
          </p>
          <Button
            className="mt-8 h-12 px-7"
            size="lg"
            onClick={() => setPhase('rules')}
          >
            Start Assessment
            <Play className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {phase === 'rules' && (
        <div className="mx-auto flex min-h-[520px] w-full max-w-3xl flex-col justify-center">
          <Badge className="mb-5 w-fit" variant="secondary">
            How this test works
          </Badge>
          <p className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            You will complete two practice calls and one final call.
          </p>
          <div className="mt-6 grid gap-3 text-sm leading-6 text-muted-foreground sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">One full listen</p>
              <p className="mt-1">Press play when ready. The audio plays once without pause or replay.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Type while listening</p>
              <p className="mt-1">You may complete the incident log while the call is playing.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Review window</p>
              <p className="mt-1">After the audio ends, you have up to 1 minute to fix or finish your notes.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">No prompts</p>
              <p className="mt-1">Use your judgement. The form will not suggest what the answer should be.</p>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-12" onClick={() => beginRun(0)}>
              Start practice call
              <Play className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12"
              onClick={() => setPhase('landing')}
            >
              Back
            </Button>
          </div>
        </div>
      )}

      {phase === 'running' && (
        <div className="mx-auto flex min-h-[560px] w-full max-w-5xl flex-col justify-center">
          <audio
            ref={audioRef}
            preload="metadata"
            src={currentRun.audioSrc}
            onLoadedMetadata={(event) => setAudioDuration(event.currentTarget.duration)}
            onTimeUpdate={(event) => setAudioCurrentTime(event.currentTarget.currentTime)}
            onEnded={handleAudioEnded}
          />

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Volume2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {currentRun.kind === 'final' ? 'Final call' : currentRun.title}
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {formatTime(audioCurrentTime)} / {formatTime(audioDuration)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {audioEnded && (
                  <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300">
                    Review time {reviewTimeLeft}s
                  </Badge>
                )}
                <Button onClick={playAudio} disabled={hasStartedAudio || audioEnded}>
                  <Play className="mr-2 h-4 w-4" />
                  {audioEnded ? 'Audio complete' : hasStartedAudio ? 'Audio playing' : 'Play audio'}
                </Button>
              </div>
            </div>
            <Progress value={audioProgress} className="mt-4 h-2" />
          </div>

          <div className="mt-5 rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-foreground">Incident log</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Complete the fields from the call audio. Use concise operational notes.
                </p>
              </div>
              <FileText className="hidden h-5 w-5 text-muted-foreground sm:block" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="incident-type">Incident type</Label>
                <Input
                  id="incident-type"
                  name="ctrl-call-incident-type"
                  autoComplete="new-password"
                  spellCheck={false}
                  value={form.incidentType}
                  onChange={(event) => updateForm('incidentType', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="ctrl-call-location"
                  autoComplete="new-password"
                  spellCheck={false}
                  value={form.location}
                  onChange={(event) => updateForm('location', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="caller-name">Caller name</Label>
                <Input
                  id="caller-name"
                  name="ctrl-call-caller-name"
                  autoComplete="new-password"
                  spellCheck={false}
                  value={form.callerName}
                  onChange={(event) => updateForm('callerName', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="callback-number">Callback number</Label>
                <Input
                  id="callback-number"
                  name="ctrl-call-callback-number"
                  autoComplete="new-password"
                  spellCheck={false}
                  value={form.callbackNumber}
                  onChange={(event) => updateForm('callbackNumber', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="people-involved">People involved</Label>
                <Textarea
                  id="people-involved"
                  name="ctrl-call-people-involved"
                  autoComplete="new-password"
                  spellCheck={false}
                  value={form.peopleInvolved}
                  onChange={(event) => updateForm('peopleInvolved', event.target.value)}
                  className="min-h-24"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="injuries-risk">Injuries / risk</Label>
                <Textarea
                  id="injuries-risk"
                  name="ctrl-call-injuries-risk"
                  autoComplete="new-password"
                  spellCheck={false}
                  value={form.injuriesRisk}
                  onChange={(event) => updateForm('injuriesRisk', event.target.value)}
                  className="min-h-24"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="services-required">Services required</Label>
                <Input
                  id="services-required"
                  name="ctrl-call-services-required"
                  autoComplete="new-password"
                  spellCheck={false}
                  value={form.servicesRequired}
                  onChange={(event) => updateForm('servicesRequired', event.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="incident-summary">Incident summary</Label>
                <Textarea
                  id="incident-summary"
                  name="ctrl-call-incident-summary"
                  autoComplete="new-password"
                  spellCheck={false}
                  value={form.incidentSummary}
                  onChange={(event) => updateForm('incidentSummary', event.target.value)}
                  className="min-h-28"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {audioEnded
                  ? `Audio finished. You have ${reviewTimeLeft}s to review or submit now.`
                  : 'Listen to the full audio. You can type while it plays.'}
              </p>
              <Button onClick={completeRun} disabled={!audioEnded}>
                {isFinalRun ? 'Submit final call' : 'Complete practice call'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {phase === 'practice-results' && latestSnapshot && (
        <div className="mx-auto flex min-h-[520px] w-full max-w-3xl flex-col justify-center text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Practice call {latestSnapshot.runIndex + 1} complete
          </p>
          <p className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Short review
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Your next practice call will start when you continue. Remember:
            the audio plays once, then you have up to 1 minute to review.
          </p>
          <div className="mx-auto mt-7 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
            <div className="rounded-xl border border-border p-4 dark:border-white/10">
              <p className="text-sm text-muted-foreground">Incident type</p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {latestSnapshot.form.incidentType || 'Not entered'}
              </p>
            </div>
            <div className="rounded-xl border border-border p-4 dark:border-white/10">
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {latestSnapshot.form.location || 'Not entered'}
              </p>
            </div>
          </div>
          <Button
            size="lg"
            className="mx-auto mt-8 h-12 px-8"
            onClick={() => beginRun(currentRunIndex + 1)}
          >
            Continue to next practice call
          </Button>
        </div>
      )}

      {phase === 'practice-complete' && latestSnapshot && (
        <div className="mx-auto flex min-h-[520px] w-full max-w-3xl flex-col justify-center text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Phone className="h-7 w-7" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Practice calls complete
          </p>
          <p className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            The final call is next
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Take a break before pressing continue. The final call uses the same
            rules, but no result screen will be shown after submission.
          </p>
          <div className="mx-auto mt-7 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Listen first</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                The final audio will play once from start to finish.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Review window</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                You will have up to 1 minute after the audio to fix your log.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Submit after audio</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                The final submit button unlocks when the audio finishes.
              </p>
            </div>
          </div>
          <Button
            size="lg"
            className="mx-auto mt-8 h-12 px-8"
            onClick={() => beginRun(FINAL_RUN_INDEX)}
          >
            Continue to final call
          </Button>
        </div>
      )}

      {phase === 'submitting' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Final call complete
          </p>
          <p className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Submitting assessment
          </p>
          <p className="mt-4 max-w-md text-muted-foreground">
            Please keep this window open while your call simulation is prepared
            for submission.
          </p>
        </div>
      )}

      {phase === 'submitted' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Assessment submitted
          </p>
          <p className="mt-4 max-w-md text-muted-foreground">
            Thank you. Your assessment has been submitted successfully. Please
            complete any remaining assessments in My Assessments. If all
            sections are complete, await further information from the Hiring
            Manager.
          </p>
          <Button
            variant="outline"
            className="mt-8 h-11 px-6"
            onClick={closeAssessment}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Close assessment
          </Button>
        </div>
      )}
    </AssessmentGameShell>
  );
}
