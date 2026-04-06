'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, FastForward, PhoneIncoming } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAssessmentIntegrity } from '@/hooks/use-assessment-integrity';
import { buildCallSimulationOutcome } from '@/lib/assessment/hybrid-assessment-model';
import { saveAssessmentOutcomeToSession } from '@/lib/assessment/hybrid-assessment-session';

const totalCalls = 3;

export default function CallSimulationTest() {
  const [currentCall, setCurrentCall] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [callEvaluations, setCallEvaluations] = useState<Array<{ completeness: number }>>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  useAssessmentIntegrity({
    assessmentType: 'call-simulation',
    enabled: true,
    metadataProvider: () => ({
      currentCall,
      isPlaying,
      progress: Math.round(progress),
    }),
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play();
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateProgress = () => {
      if (audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(100);
    });
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(100);
      });
    };
  }, []);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (progress >= 100) {
      audio.currentTime = 0;
      setProgress(0);
    }
    setIsPlaying((prev) => !prev);
  };
  
  const handleNextCall = (e: React.FormEvent) => {
    e.preventDefault();
    const formElement = e.target as HTMLFormElement;
    const formData = new FormData(formElement);

    const requiredFields = [
      'caller-name',
      'caller-phone',
      'location-address',
      'location-details',
      'incident-type',
      'incident-summary',
    ];
    const filledCount = requiredFields.reduce((count, fieldId) => {
      const value = formData.get(fieldId);
      if (typeof value === 'string' && value.trim().length > 0) return count + 1;
      return count;
    }, 0);
    const completeness = requiredFields.length > 0 ? filledCount / requiredFields.length : 0;
    const nextEvaluations = [...callEvaluations, { completeness }];

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (currentCall < totalCalls) {
      setCallEvaluations(nextEvaluations);
      setCurrentCall(prev => prev + 1);
      setIsPlaying(false);
      setProgress(0);
      formElement.reset();
    } else {
      const hybridOutcome = buildCallSimulationOutcome(nextEvaluations);
      if (hybridOutcome) {
        saveAssessmentOutcomeToSession(hybridOutcome);
      }
      router.push('/results?test=call-simulation');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">
          Emergency Call Simulation ({currentCall}/{totalCalls})
        </CardTitle>
        <CardDescription>
          Listen to the call and fill in the incident report.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Audio Player Column */}
          <div className="flex flex-col gap-6">
            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PhoneIncoming className="h-5 w-5"/>
                        <span>Incoming Call Audio</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    <audio
                      ref={audioRef}
                      src="/assets/audio.mp3"
                      preload="auto"
                      style={{ display: 'none' }}
                    />
                    <p className="text-muted-foreground">
                      {isPlaying ? 'Call in progress...' : 'Press play to start the call'}
                    </p>
                    <Progress value={progress} className="w-full" />
                    <div className="flex items-center gap-4">
                      <Button variant="ghost" size="icon" onClick={handlePlayPause}>
                        {isPlaying ? <Pause /> : <Play />}
                        <span className="sr-only">{isPlaying ? 'Pause' : 'Play'}</span>
                      </Button>
                      <p className="font-mono text-sm">
                        {audioRef.current && audioRef.current.duration > 0
                          ? `${Math.floor(audioRef.current.currentTime / 60)}:${Math.floor(audioRef.current.currentTime % 60).toString().padStart(2, '0')} / ${Math.floor(audioRef.current.duration / 60)}:${Math.floor(audioRef.current.duration % 60).toString().padStart(2, '0')}`
                          : '0:00 / 1:00'}
                      </p>
                    </div>
                </CardContent>
            </Card>
            <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
                <h4 className="font-semibold text-foreground mb-2">Instructions</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Listen carefully to the audio. You cannot rewind.</li>
                    <li>Fill out all fields in the incident log with the relevant information.</li>
                    <li>Focus on accuracy and completeness.</li>
                    <li>Submit the log to proceed to the next call.</li>
                </ul>
            </div>
          </div>

          {/* Form Column */}
          <form onSubmit={handleNextCall}>
            <Card>
                <CardHeader>
                    <CardTitle>Incident Log</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Caller Information</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="caller-name">Caller Name</Label>
                      <Input id="caller-name" name="caller-name" placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="caller-phone">Phone Number</Label>
                      <Input id="caller-phone" name="caller-phone" placeholder="(555) 123-4567" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Location Information</h3>
                   <div className="space-y-2">
                      <Label htmlFor="location-address">Address</Label>
                      <Input id="location-address" name="location-address" placeholder="123 Main St, Anytown" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location-details">Landmarks / Details</Label>
                      <Input id="location-details" name="location-details" placeholder="e.g., across from the park" />
                    </div>
                </div>

                <div className="space-y-4">
                   <h3 className="font-semibold text-lg border-b pb-2">Incident Information</h3>
                   <div className="space-y-2">
                      <Label htmlFor="incident-type">Type of Incident</Label>
                      <Input id="incident-type" name="incident-type" placeholder="e.g., Medical, Fire, Crime" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="incident-summary">Summary of Incident</Label>
                      <Textarea id="incident-summary" name="incident-summary" placeholder="Provide a brief summary of the situation..." />
                    </div>
                </div>
                 <Button type="submit" className="w-full">
                  {currentCall < totalCalls ? 'Submit & Next Call' : 'Submit & Finish Assessment'}
                  <FastForward className="ml-2 h-4 w-4" />
                </Button>
                </CardContent>
            </Card>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
