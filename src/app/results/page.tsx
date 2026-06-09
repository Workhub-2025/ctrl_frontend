'use client';

import { Suspense, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CheckCircle, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ProtectedLayout } from '@/components/auth/protected-layout';
import { HybridAssessmentSummary } from '@/types';
import {
  getHybridAssessmentSummaryFromSession,
  isHybridSummaryPersisted,
  markHybridSummaryPersisted
} from '@/lib/assessment/hybrid-assessment-session';
import { HybridAssessmentService } from '@/services';

// Component that uses useSearchParams
function ResultsContent() {
    const searchParams = useSearchParams();
    const test = searchParams.get('test');
    const [hybridSummary, setHybridSummary] = useState<HybridAssessmentSummary | null>(null);
    const [persistState, setPersistState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');

    useEffect(() => {
      const summary = getHybridAssessmentSummaryFromSession();
      setHybridSummary(summary);
    }, []);

    useEffect(() => {
      if (!hybridSummary) return;
      if (hybridSummary.outcomes.length < 3) return;
      if (isHybridSummaryPersisted()) {
        setPersistState('saved');
        return;
      }

      let cancelled = false;
      setPersistState('saving');

      HybridAssessmentService.persistSummary(hybridSummary)
        .then(() => {
          if (cancelled) return;
          markHybridSummaryPersisted();
          setPersistState('saved');
        })
        .catch(() => {
          if (cancelled) return;
          setPersistState('failed');
        });

      return () => {
        cancelled = true;
      };
    }, [hybridSummary]);

    const getTestName = () => {
        switch(test) {
            case 'typing': return 'Typing Assessment';
            case 'call-simulation': return 'Call Simulation';
            case 'situational-judgement': return 'Situational Judgement Assessment';
            default: return 'Assessment';
        }
    }

    const getStatusCopy = () => {
      if (persistState === 'saving') {
        return 'Your assessment has been submitted and is being prepared for review.';
      }

      if (persistState === 'failed') {
        return 'Your assessment has been submitted. The hiring team will review your responses shortly.';
      }

      if (persistState === 'saved') {
        return 'Your assessment has been submitted to the hiring team for review.';
      }

      return 'Your assessment has been submitted successfully.';
    };

  return (
    <ProtectedLayout>
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <PartyPopper className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-headline">
            {getTestName()} Complete!
          </CardTitle>
          <CardDescription>
            Your responses have been received successfully.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p>Thank you for completing the assessment.</p>
          </div>
          <div className="mt-4 rounded-lg border bg-muted/40 p-4 text-left">
            <p className="text-sm font-medium text-foreground">Submission received</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {getStatusCopy()}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              You will be contacted if the team would like to progress your application.
            </p>
          </div>
          <p className="mt-4 text-sm">
            You can now return to your dashboard.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full" size="lg">
            <Link href="/candidate-dashboard/my-assessments/">Return to My Assessments</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
    </ProtectedLayout>
  );
}

// Loading fallback component
function ResultsLoading() {
  return (
    <ProtectedLayout>
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <Card className="w-full max-w-lg text-center shadow-xl">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <PartyPopper className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-headline">
              Loading Results...
            </CardTitle>
            <CardDescription>
              Please wait while we process your results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </CardContent>
        </Card>
      </main>
    </ProtectedLayout>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<ResultsLoading />}>
      <ResultsContent />
    </Suspense>
  );
}
