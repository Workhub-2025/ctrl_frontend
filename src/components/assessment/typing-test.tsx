'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { typingTestData } from '@/lib/data';
import { useRouter } from 'next/navigation';
import { Clock, Target, CheckCircle, RefreshCw, Save } from 'lucide-react';
import { AssessmentProgressService } from '@/services';
import {
  saveAssessmentProgressAction,
  resumeAssessmentProgressAction,
  clearAssessmentProgressAction,
} from '@/app/actions/assessment-progress.action';
import { useAssessmentIntegrity } from '@/hooks/use-assessment-integrity';

type TestStatus = 'waiting' | 'running' | 'finished';
type TestResult = { wpm: number; accuracy: number };

const TEST_DURATION = 60; // 1 minute

interface TypingTestProps {
  enableAutoSave?: boolean;
}

export default function TypingTest({ enableAutoSave = false }: TypingTestProps) {
  const [testIndex, setTestIndex] = useState(0); // 0 = practice, 1-3 = real tests
  const [status, setStatus] = useState<TestStatus>('waiting');
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION);
  const [inputValue, setInputValue] = useState('');
  const [results, setResults] = useState<TestResult | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const currentTest = typingTestData[testIndex];
  const textToType = currentTest.text;

  useAssessmentIntegrity({
    assessmentType: 'typing',
    enabled: status !== 'waiting' || Boolean(results),
    metadataProvider: () => ({
      testIndex,
      status,
      timeLeft,
      hasResults: Boolean(results),
    }),
  });

  // Load saved progress on mount (only if enableAutoSave)
  useEffect(() => {
    const loadProgress = async () => {
      if (!enableAutoSave) {
        setIsLoading(false);
        return;
      }

      const savedRes = await resumeAssessmentProgressAction('typing');
      if (savedRes?.success && savedRes.data) {
        const saved = savedRes.data;
        if (saved.status === 'in-progress' && saved.testType === 'typing') {
          setTestIndex((saved as any).currentIndex);
          if ((saved as any).results) setResults((saved as any).results);
          if ((saved as any).inputValue) setInputValue((saved as any).inputValue);
          if ((saved as any).timeLeft !== undefined) setTimeLeft((saved as any).timeLeft);
          // Don't auto-resume running state, let user start
        }
      }
      setIsLoading(false);
    };

    loadProgress();
  }, [enableAutoSave]);

  useEffect(() => {
    if (status === 'running') {
      inputRef.current?.focus();
    }
  }, [status]);

  // Auto-save progress every 10 seconds (with debounce)
  useEffect(() => {
    if (!enableAutoSave) return;
    if (status === 'waiting' && !results) return; // Nothing to save yet

    const saveTimer = setTimeout(async () => {
      const res = await saveAssessmentProgressAction({
        testType: 'typing',
        currentIndex: testIndex,
        results: results,
        inputValue: inputValue,
        timeLeft: timeLeft,
        status: status === 'finished' ? 'completed' : 'in-progress'
      } as any);
      if (res?.success) setLastSaved(new Date());
    }, 10000);

    return () => clearTimeout(saveTimer);
  }, [enableAutoSave, testIndex, results, inputValue, timeLeft, status]);

  const calculateResults = useCallback(() => {
    const wordsTyped = inputValue.trim().split(/\s+/).length;
    const timeElapsedMinutes = (TEST_DURATION - timeLeft) / 60;
    const wpm = timeElapsedMinutes > 0 ? Math.round(wordsTyped / timeElapsedMinutes) : 0;

    let correctChars = 0;
    for (let i = 0; i < inputValue.length; i++) {
      if (inputValue[i] === textToType[i]) {
        correctChars++;
      }
    }
    const accuracy = Math.round((correctChars / inputValue.length) * 100) || 0;
    setResults({ wpm, accuracy });
  }, [inputValue, textToType, timeLeft]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === 'running' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setStatus('finished');
      calculateResults();
    }
    return () => clearInterval(timer);
  }, [status, timeLeft, calculateResults]);

  const handleStart = () => {
    setStatus('running');
    setInputValue('');
    setTimeLeft(TEST_DURATION);
    setResults(null);
  };

  const handleReset = () => {
    setStatus('waiting');
    setInputValue('');
    setTimeLeft(TEST_DURATION);
    setResults(null);
  }

  const handleNextTest = async () => {
    if(testIndex < typingTestData.length - 1) {
      setTestIndex(prev => prev + 1);
      handleReset();
    } else {
      // Clear progress when all tests are completed
      if (enableAutoSave) {
        await clearAssessmentProgressAction('typing');
      }
      router.push('/candidate-dashboard?completed=typing');
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (status !== 'running') return;
    setInputValue(e.target.value);
  };
  
  const TypedCharacters = () => {
    return (
      <p className="text-2xl font-mono tracking-wider leading-relaxed">
        {textToType.split('').map((char, index) => {
          let className = 'text-muted-foreground/70';
          if (index < inputValue.length) {
            className = char === inputValue[index] ? 'text-foreground' : 'bg-destructive/20 text-destructive-foreground rounded-sm';
          }
          if (status === 'running' && index === inputValue.length) {
            className = 'animate-pulse border-b-2 border-primary';
          }
          return (
            <span key={index} className={cn(className)}>
              {char}
            </span>
          );
        })}
      </p>
    );
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-headline">
              Typing Speed & Accuracy Test {testIndex > 0 ? `(${testIndex}/3)` : '(Practice)'}
            </CardTitle>
            <CardDescription>
              Type the text below as quickly and accurately as you can.
            </CardDescription>
          </div>
          {enableAutoSave && lastSaved && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Save className="h-4 w-4 text-green-600" />
              <span>Auto-saved</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <Clock className="text-primary h-7 w-7" />
            <div>
              <p className="text-sm text-muted-foreground">Time Left</p>
              <p className="text-2xl font-bold">{timeLeft}s</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Target className="text-primary h-7 w-7" />
            <div>
              <p className="text-sm text-muted-foreground">Accuracy</p>
              <p className="text-2xl font-bold">{results?.accuracy ?? '...'}%</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="text-primary h-7 w-7" />
            <div>
              <p className="text-sm text-muted-foreground">WPM</p>
              <p className="text-2xl font-bold">{results?.wpm ?? '...'}</p>
            </div>
          </div>
        </div>

        <div className="relative rounded-lg border p-6 bg-card" onClick={() => inputRef.current?.focus()}>
            <TypedCharacters />
            <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                className="absolute inset-0 opacity-0 cursor-text"
                disabled={status !== 'running'}
                aria-label="Typing input"
            />
        </div>
        
        <div className="mt-6 flex justify-center gap-4">
          {status === 'waiting' && (
            <Button size="lg" onClick={handleStart}>
              Start Test
            </Button>
          )}
          {status === 'running' && (
            <Button size="lg" variant="destructive" onClick={handleReset}>
                <RefreshCw className="mr-2 h-4 w-4" /> Reset
            </Button>
          )}
          {status === 'finished' && (
            <div className="flex flex-col items-center gap-4">
                <p className="text-lg font-semibold text-green-600">Test Complete!</p>
                <div className="flex gap-4">
                    <Button size="lg" onClick={handleReset} variant="outline">
                        Retry
                    </Button>
                    <Button size="lg" onClick={handleNextTest}>
                        {testIndex < typingTestData.length - 1 ? 'Next Test' : 'Finish Assessment'}
                    </Button>
                </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
