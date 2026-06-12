'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { closeAssessmentWindow, notifyAssessmentCompleted } from '@/lib/assessment-completion';
import { initCallSimulationSession } from '@/app/actions/assessment-call-simulation.actions';

type CallRun = {
  id: string;
  title: string;
  kind: 'practice' | 'final';
  audioSrc: string;
  scenarioKey?: string;
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
  | 'final-transition'
  | 'submitting'
  | 'submitted';

type IncidentForm = {
  callerName: string;
  callbackNumber: string;
  callerDob: string;
  callerDoorNo: string;
  callerStreet: string;
  callerPostcode: string;
  incidentCategory: string;
  callerType: string;
  responseTime: string;
  referenceNumber: string;
  suspectGender: string;
  suspectEthnicity: string;
  suspectAge: string;
  suspectClothing: string;
  uniqueInformation: string;
  incidentDoorNo: string;
  incidentStreet: string;
  incidentPostcode: string;
  incidentSummary: string;
  keyInformation1: string;
  keyInformation2: string;
  keyInformation3: string;
};

type RunSnapshot = {
  runIndex: number;
  scenarioKey?: string;
  form: IncidentForm;
  timestamps: Record<string, number>;
};

const CONTENT_URL = '/assessment-content/call-simulation.json';
const REVIEW_SECONDS = 60;

const REFERENCE_NUMBER_OPTIONS = [
  '63918',
  '63981',
  '36918',
  '63910',
  '69318',
  '63198',
  '63928',
  '39618',
];

const emptyForm: IncidentForm = {
  callerName: '',
  callbackNumber: '',
  callerDob: '',
  callerDoorNo: '',
  callerStreet: '',
  callerPostcode: '',
  incidentCategory: '',
  callerType: '',
  responseTime: '',
  referenceNumber: '',
  suspectGender: '',
  suspectEthnicity: '',
  suspectAge: '',
  suspectClothing: '',
  uniqueInformation: '',
  incidentDoorNo: '',
  incidentStreet: '',
  incidentPostcode: '',
  incidentSummary: '',
  keyInformation1: '',
  keyInformation2: '',
  keyInformation3: '',
};

const fallbackRuns: CallRun[] = [
  {
    id: 'fallback-practice',
    title: 'Practice Call',
    kind: 'practice',
    audioSrc: '/assets/Call%202%20-%20Burglary%20of%20a%20Residential%20Property%20v3_FINAL.mp3',
    scenarioKey: 'call_2_burglary_residential',
  },
  {
    id: 'fallback-call-1',
    title: 'Call 1',
    kind: 'final',
    audioSrc: '/assets/Call%202%20-%20Burglary%20of%20a%20Residential%20Property%20v3_FINAL.mp3',
    scenarioKey: 'call_2_burglary_residential',
  },
  {
    id: 'fallback-call-2',
    title: 'Call 2',
    kind: 'final',
    audioSrc: '/assets/Call%202%20-%20Burglary%20of%20a%20Residential%20Property%20v3_FINAL.mp3',
    scenarioKey: 'call_2_burglary_residential',
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

// ─── Accordion Section ────────────────────────────────────────────────────────

type SectionId = 'caller' | 'system' | 'suspect' | 'location' | 'incident';

const SECTION_LABELS: Record<SectionId, string> = {
  caller: '1. Caller Information',
  system: '2. System Information',
  suspect: '3. Suspect Information',
  location: '4. Incident Location',
  incident: '5. Incident Details',
};

function AccordionSection({
  id,
  openSection,
  onToggle,
  children,
}: {
  id: SectionId;
  openSection: SectionId | null;
  onToggle: (id: SectionId) => void;
  children: React.ReactNode;
}) {
  const isOpen = openSection === id;

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        isOpen
          ? 'border-primary/40 bg-muted/30 dark:border-primary/30 dark:bg-white/[0.03]'
          : 'border-border/60 bg-muted/10 dark:border-white/5 dark:bg-white/[0.01]'
      }`}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
        id={`accordion-header-${id}`}
      >
        <span
          className={`text-sm font-semibold transition-colors ${
            isOpen ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          {SECTION_LABELS[id]}
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        }`}
        role="region"
        aria-labelledby={`accordion-header-${id}`}
      >
        <div className="px-4 pb-4 pt-1">{children}</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CallSimulationTest({
  candidateSessionDocumentId,
}: {
  candidateSessionDocumentId?: string | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const formRef = useRef<IncidentForm>(emptyForm);
  const runIndexRef = useRef(0);
  const isFinalRunRef = useRef(false);
  const startedAtRef = useRef<string | null>(null);
  const snapshotsRef = useRef<RunSnapshot[]>([]);
  const [phase, setPhase] = useState<CallPhase>('landing');
  const [runs, setRuns] = useState<CallRun[]>(fallbackRuns);
  const [currentRunIndex, setCurrentRunIndex] = useState(0);
  const [form, setForm] = useState<IncidentForm>(emptyForm);
  const [timestamps, setTimestamps] = useState<Record<string, number>>({});
  const timestampsRef = useRef<Record<string, number>>({});
  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});
  const [snapshots, setSnapshots] = useState<RunSnapshot[]>([]);
  const [hasStartedAudio, setHasStartedAudio] = useState(false);
  const [audioEnded, setAudioEnded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [reviewTimeLeft, setReviewTimeLeft] = useState(REVIEW_SECONDS);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isBypassed, setIsBypassed] = useState(false);
  const [openSection, setOpenSection] = useState<SectionId | null>('caller');

  const currentRun = useMemo(() => {
    return runs[currentRunIndex] ?? fallbackRuns[currentRunIndex] ?? fallbackRuns[0];
  }, [currentRunIndex, runs]);
  const isFinalRun = currentRun.kind === 'final';
  const audioProgress =
    audioDuration > 0 ? Math.min((audioCurrentTime / audioDuration) * 100, 100) : 0;
  const latestSnapshot = snapshots[snapshots.length - 1];

  const practiceCount = useMemo(() => runs.filter((r) => r.kind === 'practice').length, [runs]);
  const finalCount = useMemo(() => runs.filter((r) => r.kind === 'final').length, [runs]);
  const firstFinalRunIndex = useMemo(() => {
    const index = runs.findIndex((r) => r.kind === 'final');
    return index !== -1 ? index : 0;
  }, [runs]);

  // Human-readable call label: "Practice Simulated Call" / "Simulated Call 1" / "Simulated Call 2" …
  const currentRunLabel = useMemo(() => {
    if (currentRun.kind === 'practice') {
      const practiceRuns = runs.filter((r) => r.kind === 'practice');
      const posAmongPractice = practiceRuns.findIndex((r) => r.id === currentRun.id) + 1;
      return practiceCount > 1
        ? `Practice Simulated Call ${posAmongPractice}`
        : 'Practice Simulated Call';
    }
    const finalRuns = runs.filter((r) => r.kind === 'final');
    const posAmongFinals = finalRuns.findIndex((r) => r.id === currentRun.id) + 1;
    return `Simulated Call ${posAmongFinals}`;
  }, [currentRun, runs, practiceCount]);

  const handleSectionToggle = (id: SectionId) => {
    setOpenSection((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    timestampsRef.current = timestamps;
  }, [timestamps]);

  useEffect(() => {
    runIndexRef.current = currentRunIndex;
  }, [currentRunIndex]);

  useEffect(() => {
    isFinalRunRef.current = isFinalRun;
  }, [isFinalRun]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const sessionData = await initCallSimulationSession(candidateSessionDocumentId);
        if (cancelled) return;
        if (sessionData && sessionData.runs && sessionData.runs.length > 0) {
          const sortedRuns = [...sessionData.runs].sort((a, b) => {
            if (a.kind !== b.kind) {
              return a.kind === 'practice' ? -1 : 1;
            }
            return a.scenarioKey.localeCompare(b.scenarioKey);
          });
          setRuns(sortedRuns);
          return;
        }
      } catch (err) {
        console.error('[CallSimulationTest] Failed to load call simulation session:', err);
      }

      // Fallback: fetch static JSON
      try {
        const response = await fetch(CONTENT_URL);
        if (!response.ok) throw new Error('Unable to load call simulation content');
        const content = await response.json() as CallContentFile;
        if (!cancelled && Array.isArray(content.runs) && content.runs.length > 0) {
          setRuns(content.runs);
        }
      } catch {
        if (!cancelled) setRuns(fallbackRuns);
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [candidateSessionDocumentId]);

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

  const trackFieldTimestamp = (fieldName: keyof IncidentForm) => {
    if (timeoutRefs.current[fieldName]) {
      clearTimeout(timeoutRefs.current[fieldName]);
    }

    timeoutRefs.current[fieldName] = setTimeout(() => {
      const audio = audioRef.current;
      if (audio && !audio.paused && audio.currentTime > 0) {
        const time = audio.currentTime;
        setTimestamps((prev) => {
          if (prev[fieldName] !== undefined) return prev;
          return { ...prev, [fieldName]: time };
        });
      }
    }, 300);
  };

  const handleFieldBlur = (fieldName: keyof IncidentForm) => {
    if (timeoutRefs.current[fieldName]) {
      clearTimeout(timeoutRefs.current[fieldName]);
    }
    const audio = audioRef.current;
    if (audio && !audio.paused && audio.currentTime > 0) {
      const time = audio.currentTime;
      setTimestamps((prev) => {
        if (prev[fieldName] !== undefined) return prev;
        return { ...prev, [fieldName]: time };
      });
    }
  };

  const historyRef = useRef<Array<{ timestamp: number; field: keyof IncidentForm; value: string }>>([]);

  const beginRun = useCallback((runIndex: number) => {
    if (!startedAtRef.current) {
      startedAtRef.current = new Date().toISOString();
    }
    setCurrentRunIndex(runIndex);
    setForm(emptyForm);
    setTimestamps({});
    historyRef.current = [];
    setReviewTimeLeft(REVIEW_SECONDS);
    setOpenSection('caller');
    setPhase('running');
  }, []);

  const handleBypass = useCallback(() => {
    if (!startedAtRef.current) {
      startedAtRef.current = new Date().toISOString();
    }
    setIsBypassed(true);
    setPhase('submitting');
  }, []);

  const closeAssessment = useCallback(() => {
    closeAssessmentWindow();
  }, []);

  const updateForm = (field: keyof IncidentForm, value: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
    trackFieldTimestamp(field);

    const audio = audioRef.current;
    if (audio) {
      const time = audio.ended ? audio.duration : audio.currentTime;
      historyRef.current.push({
        timestamp: time,
        field,
        value,
      });
    }
  };

  const playAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    await audio.play();
    setHasStartedAudio(true);
    setIsPlaying(true);
  };

  const skipAudio = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = audio.duration > 0 ? audio.duration - 0.5 : 0;
    }
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
      scenarioKey: (runs[activeRunIndex] ?? fallbackRuns[activeRunIndex])?.scenarioKey,
      form: formRef.current,
      timestamps: timestampsRef.current,
      history: historyRef.current,
    };

    snapshotsRef.current = [...snapshotsRef.current, snapshot];
    setSnapshots(snapshotsRef.current);

    if (activeRunIndex === runs.length - 1) {
      setPhase('submitting');
      return;
    }

    const current = runs[activeRunIndex] ?? fallbackRuns[activeRunIndex] ?? fallbackRuns[0];
    const nextRun = runs[activeRunIndex + 1];

    if (current.kind === 'final') {
      setPhase('final-transition');
      return;
    }

    if (nextRun && nextRun.kind === 'final') {
      setPhase('practice-complete');
      return;
    }

    setPhase('practice-results');
  }, [runs]);

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

    let cancelled = false;

    const submitAssessment = async () => {
      try {
        const response = await fetch('/api/assessment/call-simulation/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            snapshots: snapshotsRef.current,
            startedAt: startedAtRef.current ?? new Date().toISOString(),
            completedAt: new Date().toISOString(),
            candidateSessionDocumentId,
            isBypass: isBypassed,
          }),
        });

        if (!response.ok && response.status !== 409) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error ?? 'Submission failed');
        }

        if (!cancelled) {
          notifyAssessmentCompleted('call-simulation');
          setPhase('submitted');
        }
      } catch (error) {
        if (!cancelled) {
          setSubmitError(error instanceof Error ? error.message : 'Submission failed');
          setPhase('submitted');
        }
      }
    };

    void submitAssessment();

    return () => {
      cancelled = true;
    };
  }, [candidateSessionDocumentId, phase, isBypassed]);

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
            <Phone className="h-8 w-8" aria-hidden="true" />
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
            <Play className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {phase === 'rules' && (
        <div className="mx-auto flex min-h-[520px] w-full max-w-3xl flex-col justify-center">
          <Badge className="mb-5 w-fit" variant="secondary">
            How this test works
          </Badge>
          <p className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            You will complete {practiceCount} practice {practiceCount === 1 ? 'call' : 'calls'} and {finalCount} final {finalCount === 1 ? 'call' : 'calls'}.
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
          <div className="mt-8 flex flex-wrap gap-3 items-center">
            <Button size="lg" className="h-12" onClick={() => beginRun(0)}>
              Start practice call
              <Play className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12"
              onClick={() => beginRun(firstFinalRunIndex)}
            >
              Skip practice calls
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

          {/* Audio Player Card */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Volume2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {currentRunLabel}
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
                  <Play className="mr-2 h-4 w-4" aria-hidden="true" />
                  {audioEnded ? 'Audio complete' : hasStartedAudio ? 'Audio playing' : 'Play audio'}
                </Button>
                {hasStartedAudio && !audioEnded && (
                  <Button
                    variant="outline"
                    className="border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                    onClick={skipAudio}
                  >
                    Skip audio
                  </Button>
                )}
              </div>
            </div>
            <Progress value={audioProgress} className="mt-4 h-2" />
          </div>

          {/* Incident Log Card */}
          <div className="mt-5 rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-foreground">Incident log</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Complete the fields from the call audio. Tap a section to expand it.
                </p>
              </div>
              <FileText className="hidden h-5 w-5 text-muted-foreground sm:block" aria-hidden="true" />
            </div>

            <div className="space-y-2">

              {/* ── Section 1: Caller Information ── */}
              <AccordionSection id="caller" openSection={openSection} onToggle={handleSectionToggle}>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="caller-name">Caller Name</Label>
                    <Input
                      id="caller-name"
                      name="ctrl-call-caller-name"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.callerName}
                      onChange={(event) => updateForm('callerName', event.target.value)}
                      onBlur={() => handleFieldBlur('callerName')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="callback-number">Telephone Number</Label>
                    <Input
                      id="callback-number"
                      name="ctrl-call-callback-number"
                      type="tel"
                      inputMode="tel"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.callbackNumber}
                      onChange={(event) => updateForm('callbackNumber', event.target.value)}
                      onBlur={() => handleFieldBlur('callbackNumber')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caller-dob">Date of Birth</Label>
                    <Input
                      id="caller-dob"
                      name="ctrl-call-caller-dob"
                      placeholder="DD/MM/YYYY"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.callerDob}
                      onChange={(event) => updateForm('callerDob', event.target.value)}
                      onBlur={() => handleFieldBlur('callerDob')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caller-door-no">Caller Door No.</Label>
                    <Input
                      id="caller-door-no"
                      name="ctrl-call-caller-door-no"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.callerDoorNo}
                      onChange={(event) => updateForm('callerDoorNo', event.target.value)}
                      onBlur={() => handleFieldBlur('callerDoorNo')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caller-street">Caller Street</Label>
                    <Input
                      id="caller-street"
                      name="ctrl-call-caller-street"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.callerStreet}
                      onChange={(event) => updateForm('callerStreet', event.target.value)}
                      onBlur={() => handleFieldBlur('callerStreet')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caller-postcode">Caller Postcode</Label>
                    <Input
                      id="caller-postcode"
                      name="ctrl-call-caller-postcode"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.callerPostcode}
                      onChange={(event) => updateForm('callerPostcode', event.target.value)}
                      onBlur={() => handleFieldBlur('callerPostcode')}
                    />
                  </div>
                </div>
              </AccordionSection>

              {/* ── Section 2: System Information ── */}
              <AccordionSection id="system" openSection={openSection} onToggle={handleSectionToggle}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="incident-category">Incident Category</Label>
                    <Select
                      value={form.incidentCategory}
                      onValueChange={(value) => updateForm('incidentCategory', value)}
                    >
                      <SelectTrigger id="incident-category" className="w-full bg-background border-border dark:border-white/10 dark:bg-white/[0.03]">
                        <SelectValue placeholder="Select incident category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Residential Burglary">Residential Burglary</SelectItem>
                        <SelectItem value="Commercial Burglary">Commercial Burglary</SelectItem>
                        <SelectItem value="Theft from Vehicle">Theft from Vehicle</SelectItem>
                        <SelectItem value="Shoplifting">Shoplifting</SelectItem>
                        <SelectItem value="Assault">Assault</SelectItem>
                        <SelectItem value="Anti-Social Behaviour">Anti-Social Behaviour</SelectItem>
                        <SelectItem value="Criminal Damage">Criminal Damage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caller-type">Caller Type</Label>
                    <Select
                      value={form.callerType}
                      onValueChange={(value) => updateForm('callerType', value)}
                    >
                      <SelectTrigger id="caller-type" className="w-full bg-background border-border dark:border-white/10 dark:bg-white/[0.03]">
                        <SelectValue placeholder="Select caller type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Victim">Victim</SelectItem>
                        <SelectItem value="Witness">Witness</SelectItem>
                        <SelectItem value="Third Party">Third Party</SelectItem>
                        <SelectItem value="Emergency Services Personnel">Emergency Services Personnel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="response-time">Response Time / Grade</Label>
                    <Select
                      value={form.responseTime}
                      onValueChange={(value) => updateForm('responseTime', value)}
                    >
                      <SelectTrigger id="response-time" className="w-full bg-background border-border dark:border-white/10 dark:bg-white/[0.03]">
                        <SelectValue placeholder="Select response grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Emergency / immediate response">Emergency / immediate response</SelectItem>
                        <SelectItem value="Priority / officers within 60 minutes">Priority / officers within 60 minutes</SelectItem>
                        <SelectItem value="Scheduled / appointment">Scheduled / appointment</SelectItem>
                        <SelectItem value="Resolution without deployment">Resolution without deployment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference-number">Reference Number</Label>
                    <Select
                      value={form.referenceNumber}
                      onValueChange={(value) => updateForm('referenceNumber', value)}
                    >
                      <SelectTrigger id="reference-number" className="w-full bg-background border-border dark:border-white/10 dark:bg-white/[0.03]">
                        <SelectValue placeholder="Select reference number" />
                      </SelectTrigger>
                      <SelectContent>
                        {REFERENCE_NUMBER_OPTIONS.map((ref) => (
                          <SelectItem key={ref} value={ref}>
                            {ref}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </AccordionSection>

              {/* ── Section 3: Suspect Information ── */}
              <AccordionSection id="suspect" openSection={openSection} onToggle={handleSectionToggle}>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="suspect-gender">Suspect Gender</Label>
                    <Select
                      value={form.suspectGender}
                      onValueChange={(value) => updateForm('suspectGender', value)}
                    >
                      <SelectTrigger id="suspect-gender" className="w-full bg-background border-border dark:border-white/10 dark:bg-white/[0.03]">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="suspect-ethnicity">Suspect Ethnicity</Label>
                    <Select
                      value={form.suspectEthnicity}
                      onValueChange={(value) => updateForm('suspectEthnicity', value)}
                    >
                      <SelectTrigger id="suspect-ethnicity" className="w-full bg-background border-border dark:border-white/10 dark:bg-white/[0.03]">
                        <SelectValue placeholder="Select ethnicity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="White">White</SelectItem>
                        <SelectItem value="Asian">Asian</SelectItem>
                        <SelectItem value="Black">Black</SelectItem>
                        <SelectItem value="Mixed">Mixed</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        <SelectItem value="Unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="suspect-age">Suspect Age Range</Label>
                    <Select
                      value={form.suspectAge}
                      onValueChange={(value) => updateForm('suspectAge', value)}
                    >
                      <SelectTrigger id="suspect-age" className="w-full bg-background border-border dark:border-white/10 dark:bg-white/[0.03]">
                        <SelectValue placeholder="Select age range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Under 18">Under 18</SelectItem>
                        <SelectItem value="18-25 years">18–25 years</SelectItem>
                        <SelectItem value="25-35 years">25–35 years</SelectItem>
                        <SelectItem value="35-40 years">35–40 years</SelectItem>
                        <SelectItem value="40-50 years">40–50 years</SelectItem>
                        <SelectItem value="50-60 years">50–60 years</SelectItem>
                        <SelectItem value="Over 60">Over 60</SelectItem>
                        <SelectItem value="Unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-3">
                    <Label htmlFor="suspect-clothing">Suspect Clothing & Key Details</Label>
                    <Input
                      id="suspect-clothing"
                      name="ctrl-call-suspect-clothing"
                      placeholder="Describe clothing worn by suspect and other key details"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.suspectClothing}
                      onChange={(event) => updateForm('suspectClothing', event.target.value)}
                      onBlur={() => handleFieldBlur('suspectClothing')}
                    />
                  </div>
                </div>
              </AccordionSection>

              {/* ── Section 4: Incident Location ── */}
              <AccordionSection id="location" openSection={openSection} onToggle={handleSectionToggle}>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="incident-door-no">Incident Door No.</Label>
                    <Input
                      id="incident-door-no"
                      name="ctrl-call-incident-door-no"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.incidentDoorNo}
                      onChange={(event) => updateForm('incidentDoorNo', event.target.value)}
                      onBlur={() => handleFieldBlur('incidentDoorNo')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="incident-street">Incident Street</Label>
                    <Input
                      id="incident-street"
                      name="ctrl-call-incident-street"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.incidentStreet}
                      onChange={(event) => updateForm('incidentStreet', event.target.value)}
                      onBlur={() => handleFieldBlur('incidentStreet')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="incident-postcode">Incident Postcode</Label>
                    <Input
                      id="incident-postcode"
                      name="ctrl-call-incident-postcode"
                      autoComplete="off"
                      spellCheck={false}
                      value={form.incidentPostcode}
                      onChange={(event) => updateForm('incidentPostcode', event.target.value)}
                      onBlur={() => handleFieldBlur('incidentPostcode')}
                    />
                  </div>
                </div>
              </AccordionSection>

              {/* ── Section 5: Incident Details ── */}
              <AccordionSection id="incident" openSection={openSection} onToggle={handleSectionToggle}>
                <div className="space-y-2">
                  <Label htmlFor="incident-summary">Incident Summary &amp; Details</Label>
                  <p className="text-xs text-muted-foreground">
                    Summarise what happened, including how entry was gained, property stolen, suspect details, and any witness/CCTV information.
                  </p>
                  <Textarea
                    id="incident-summary"
                    name="ctrl-call-incident-summary"
                    autoComplete="off"
                    spellCheck={false}
                    value={form.incidentSummary}
                    onChange={(event) => updateForm('incidentSummary', event.target.value)}
                    onBlur={() => handleFieldBlur('incidentSummary')}
                    className="min-h-36 resize-none"
                    placeholder="e.g. Caller reports residential burglary at above address. Suspect entered via rear kitchen window — forced entry. Gold necklace stolen from bedroom. Male suspect, Asian, 40-50 years, green hi-vis jacket. Neighbour’s CCTV may have captured suspect…"
                  />
                </div>
              </AccordionSection>

            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {audioEnded
                  ? `Audio finished. You have ${reviewTimeLeft}s to review or submit now.`
                  : 'Listen to the full audio. You can type while it plays.'}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={completeRun} disabled={!audioEnded}>
                  {isFinalRun ? 'Submit final call' : 'Complete practice call'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === 'practice-results' && latestSnapshot && (
        <div className="mx-auto flex min-h-[520px] w-full max-w-3xl flex-col justify-center text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
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
              <p className="text-sm text-muted-foreground">Incident Category</p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {latestSnapshot.form.incidentCategory || 'Not entered'}
              </p>
            </div>
            <div className="rounded-xl border border-border p-4 dark:border-white/10">
              <p className="text-sm text-muted-foreground">Incident Location</p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {[
                  latestSnapshot.form.incidentDoorNo,
                  latestSnapshot.form.incidentStreet,
                  latestSnapshot.form.incidentPostcode
                ].filter(Boolean).join(', ') || 'Not entered'}
              </p>
            </div>
          </div>
          <div className="mx-auto mt-8 flex flex-col gap-2 w-full max-w-xs">
            <Button
              size="lg"
              className="h-12 w-full"
              onClick={() => beginRun(currentRunIndex + 1)}
            >
              Continue to next practice call
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="h-12 w-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
              onClick={() => setPhase('practice-complete')}
            >
              Skip remaining practice
            </Button>
          </div>
        </div>
      )}

      {phase === 'practice-complete' && latestSnapshot && (
        <div className="mx-auto flex min-h-[520px] w-full max-w-3xl flex-col justify-center text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Phone className="h-7 w-7" aria-hidden="true" />
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
            onClick={() => beginRun(firstFinalRunIndex)}
          >
            Continue to final call
          </Button>
        </div>
      )}

      {phase === 'final-transition' && (
        <div className="mx-auto flex min-h-[520px] w-full max-w-3xl flex-col justify-center text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Phone className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {currentRun.title} complete
          </p>
          <p className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            The next final call is ready
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Take a break before pressing continue. The next final call uses the same
            rules, and no result screen will be shown after submission.
          </p>
          <div className="mx-auto mt-7 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Listen first</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                The next audio will play once from start to finish.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">Review window</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                You will have up to 1 minute after the audio to fix your log.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="font-medium text-foreground">No prompts</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Use your judgement. The form will not suggest what the answer should be.
              </p>
            </div>
          </div>
          <Button
            size="lg"
            className="mx-auto mt-8 h-12 px-8"
            onClick={() => beginRun(currentRunIndex + 1)}
          >
            Continue to {runs[currentRunIndex + 1]?.title || 'next call'}
          </Button>
        </div>
      )}

      {phase === 'submitting' && (
        <div className="flex min-h-[520px] w-full flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {currentRunLabel} complete
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
          <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${submitError ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600 dark:text-green-400'}`}>
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </div>
          <p className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Assessment submitted
          </p>
          <p className="mt-4 max-w-md text-muted-foreground">
            {submitError
              ? submitError
              : 'Thank you. Your assessment has been submitted successfully. Please complete any remaining assessments in My Assessments. If all sections are complete, await further information from the Hiring Manager.'}
          </p>
          <Button
            variant="outline"
            className="mt-8 h-11 px-6"
            onClick={closeAssessment}
          >
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            Close assessment
          </Button>
        </div>
      )}
    </AssessmentGameShell>
  );
}
