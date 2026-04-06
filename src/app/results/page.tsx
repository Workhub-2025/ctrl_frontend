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
import { getHybridAssessmentSummaryFromSession } from '@/lib/assessment/hybrid-assessment-session';

// Component that uses useSearchParams
function ResultsContent() {
    const searchParams = useSearchParams();
    const test = searchParams.get('test');
    const [hybridSummary, setHybridSummary] = useState<HybridAssessmentSummary | null>(null);

    useEffect(() => {
      setHybridSummary(getHybridAssessmentSummaryFromSession());
    }, []);

    const getTestName = () => {
        switch(test) {
            case 'typing': return 'Typing Test';
            case 'call-simulation': return 'Call Simulation';
            case 'situational-judgement': return 'Situational Judgement Test';
            default: return 'Assessment';
        }
    }

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
            Your results have been successfully recorded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p>Thank you for completing the assessment.</p>
          </div>
          {hybridSummary && (
            <div className="mt-4 rounded-lg border bg-muted/40 p-4 text-left">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Hybrid Readiness Summary</p>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Overall readiness score</p>
                  <p className="text-2xl font-semibold">{hybridSummary.overallScore}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Readiness band</p>
                  <p className="text-2xl font-semibold capitalize">{hybridSummary.readinessBand.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          )}
          <p className="mt-4 text-sm">
            You may now return to the dashboard to view your completed assessments or start a new one.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full" size="lg">
            <Link href="/dashboard">Return to Dashboard</Link>
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
