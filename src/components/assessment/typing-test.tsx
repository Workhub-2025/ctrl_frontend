'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Clock, Target, CheckCircle, RefreshCw, Save, Loader2 } from 'lucide-react';
import {
  saveAssessmentProgressAction,
  resumeAssessmentProgressAction,
  clearAssessmentProgressAction,
} from '@/app/actions/assessment-progress.action';
import { 
  saveTypingTestResult, 
  getTypingText,
} from '@/app/actions/typing-test.actions';
import { useToast } from '@/hooks/use-toast';
import { ITypingText } from '@/types';

type TestStatus = 'waiting' | 'running' | 'finished';
type TestResult = { wpm: number; accuracy: number };

const TEST_DURATION = 10; // 1 minute
const TOTAL_TESTS = 3; // 3 real tests (excluding practice)

interface TypingTestProps {
  readonly enableAutoSave?: boolean;
}

// TypedCharacters component moved outside for better performance
interface TypedCharactersProps {
  textToType: string;
  inputValue: string;
  status: TestStatus;
}

const TypedCharacters = ({ textToType, inputValue, status }: TypedCharactersProps) => {
  if (!textToType) return null;
  
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
          <span key={`char-${index}-${char}`} className={cn(className)}>
            {char}
          </span>
        );
      })}
    </p>
  );
};

export default function TypingTest({ enableAutoSave = false }: TypingTestProps) {
  const [testIndex, setTestIndex] = useState(0); // 0 = practice, 1-3 = real tests
  const [status, setStatus] = useState<TestStatus>('waiting');
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION);
  const [inputValue, setInputValue] = useState('');
  const [results, setResults] = useState<TestResult | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentText, setCurrentText] = useState<ITypingText | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  const textToType = currentText?.text || '';
  const isPractice = testIndex === 0;
  const currentTestNumber = isPractice ? 'Practice' : `${testIndex}/3`;

  // Load text for current test
  useEffect(() => {
    const loadText = async () => {
      setIsLoading(true);
      try {
        const result = isPractice 
          ? await getTypingText('practice')
          : await getTypingText('test', testIndex as 1 | 2 | 3);

        if (result.success) {
          setCurrentText(result.data);
        } else {
          toast({
            title: 'Error loading text',
            description: result.error,
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error loading text:', error);
        toast({
          title: 'Error',
          description: 'Failed to load typing test text',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadText();
  }, [testIndex, isPractice, toast]);

  // Load saved progress on mount (only if enableAutoSave)
  useEffect(() => {
    const loadProgress = async () => {
      if (!enableAutoSave) {
        return;
      }

      const savedRes = await resumeAssessmentProgressAction('typing');
      if (savedRes?.success && savedRes.data) {
        const saved = savedRes.data;
        if (saved.status === 'in-progress' && saved.testType === 'typing') {
          setTestIndex((saved as any).currentIndex || 0);
          if ((saved as any).results) setResults((saved as any).results);
          if ((saved as any).inputValue) setInputValue((saved as any).inputValue);
          if ((saved as any).timeLeft !== undefined) setTimeLeft((saved as any).timeLeft);
        }
      }
    };

    loadProgress();
  }, [enableAutoSave]);

  useEffect(() => {
    if (status === 'running') {
      inputRef.current?.focus();
    }
  }, [status]);

  // Auto-save progress every 10 seconds
  useEffect(() => {
    if (!enableAutoSave) return;
    if (status === 'waiting' && !results) return;

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

  // Timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === 'running' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0 && status === 'running') {
      setStatus('finished');
      calculateResults();
    }
    return () => clearInterval(timer);
  }, [status, timeLeft]);

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
  };

  const handleNextTest = async () => {
    // If practice, just move to test 1
    if (isPractice) {
      setTestIndex(1);
      handleReset();
      return;
    }

    // Save result for real tests
    if (results) {
      setIsSaving(true);
      try {
        const saveResult = await saveTypingTestResult({
          testNumber: testIndex as 1 | 2 | 3,
          wpm: results.wpm,
          accuracy: results.accuracy,
          textUsed: textToType,
        });

        if (!saveResult.success) {
          toast({
            title: 'Error saving result',
            description: saveResult.error,
            variant: 'destructive',
          });
          setIsSaving(false);
          return;
        }

        toast({
          title: 'Test saved',
          description: `Test ${testIndex} completed successfully`,
        });
      } catch (error) {
        console.error('Error saving test result:', error);
        toast({
          title: 'Error',
          description: 'Failed to save test result',
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      } finally {
        setIsSaving(false);
      }
    }

    // Move to next test or finish
    if (testIndex < TOTAL_TESTS) {
      setTestIndex(prev => prev + 1);
      handleReset();
    } else {
      // All tests completed
      if (enableAutoSave) {
        await clearAssessmentProgressAction('typing');
      }
      router.push('/results?test=typing');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (status !== 'running') return;
    setInputValue(e.target.value);
  };

  const calculateResults = () => {
    const wordsTyped = inputValue.trim().split(/\s+/).length;
    const timeElapsedMinutes = (TEST_DURATION - timeLeft) / 60;
    const wpm = timeElapsedMinutes > 0 ? Math.round(wordsTyped / timeElapsedMinutes) : 0;

    let correctChars = 0;
    for (let i = 0; i < inputValue.length; i++) {
      if (inputValue[i] === textToType[i]) {
        correctChars++;
      }
    }
    const accuracy = inputValue.length > 0 
      ? Math.round((correctChars / inputValue.length) * 100) 
      : 0;
    
    setResults({ wpm, accuracy });
  };

  const getButtonText = () => {
    if (isSaving) return 'Saving...';
    if (isPractice) return 'Start Real Tests';
    if (testIndex < TOTAL_TESTS) return 'Next Test';
    return 'Finish Assessment';
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading typing test...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentText || !textToType) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <p className="text-muted-foreground">No text available for this test</p>
            <Button onClick={() => router.push('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
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
              Typing Speed & Accuracy Test {isPractice ? '(Practice)' : `(${currentTestNumber})`}
            </CardTitle>
            <CardDescription>
              {isPractice 
                ? 'Practice test - Type the text below to get familiar with the test format.'
                : 'Type the text below as quickly and accurately as you can.'
              }
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

        <label 
          className="block relative rounded-lg border p-6 bg-card min-h-[200px] cursor-text" 
        >
            <TypedCharacters 
              textToType={textToType} 
              inputValue={inputValue} 
              status={status} 
            />
            <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                className="absolute inset-0 opacity-0 cursor-text"
                disabled={status !== 'running'}
                aria-label="Typing input area"
            />
        </label>
        
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
                <p className="text-lg font-semibold text-green-600">
                  {isPractice ? 'Practice Complete!' : 'Test Complete!'}
                </p>
                <div className="flex gap-4">
                    <Button size="lg" onClick={handleReset} variant="outline">
                        Retry
                    </Button>
                    <Button 
                      size="lg" 
                      onClick={handleNextTest}
                      disabled={isSaving}
                    >
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {getButtonText()}
                    </Button>
                </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
