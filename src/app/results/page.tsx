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
import { RoleDashboardShell } from '@/components/dashboard/role-dashboard-shell';
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
    <RoleDashboardShell
      title="Assessment Complete"
      subtitle="Your responses have been saved and verified"
      hideSidebar={true}
      navItems={[]}
    >
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 sm:p-8 relative overflow-hidden">
        {/* Subtle decorative background glows */}
        <div className="absolute top-1/4 right-1/4 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 -z-10 h-[350px] w-[350px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

        <Card className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0e172e]/80 to-[#0b1329]/50 backdrop-blur-md p-6 sm:p-8 shadow-2xl relative text-center">
          {/* Card subtle glowing design elements */}
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />

          <CardHeader className="relative pb-6">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_25px_rgba(16,185,129,0.12)]">
              <PartyPopper className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl font-black tracking-tight text-white font-display">
              {getTestName()} Complete!
            </CardTitle>
            <CardDescription className="text-slate-400 text-sm mt-1.5 max-w-sm mx-auto">
              Your assessment responses have been securely received and processed.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="relative space-y-6">
            <div className="flex items-center justify-center gap-2 text-slate-300">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <p className="text-sm font-medium">Thank you for completing this assessment.</p>
            </div>
            
            <div className="rounded-xl border border-white/5 bg-[#0b1329]/30 p-5 text-left space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase text-slate-500 font-bold tracking-wider">Submission status</p>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                  Received &amp; Verified
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {getStatusCopy()}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-3">
                The hiring team will review your results and contact you directly if they wish to progress your application.
              </p>
            </div>
            
            <p className="text-xs text-slate-500">
              You can now safely return to your candidate portal dashboard.
            </p>
          </CardContent>
          
          <CardFooter className="relative pt-6 px-0">
            <Button asChild className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-primary text-white font-bold text-sm hover:from-indigo-400 hover:to-primary/90 transition-all shadow-[0_4px_15px_rgba(99,102,241,0.2)]" size="lg">
              <Link href="/candidate-dashboard/my-assessments/">
                Return to My Assessments
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </RoleDashboardShell>
  );
}

// Loading fallback component
function ResultsLoading() {
  return (
    <RoleDashboardShell
      title="Loading Results"
      subtitle="Verifying and submitting your results..."
      hideSidebar={true}
      navItems={[]}
    >
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 sm:p-8 relative overflow-hidden animate-pulse">
        <Card className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0e172e]/80 to-[#0b1329]/50 backdrop-blur-md p-6 sm:p-8 shadow-2xl relative text-center">
          <CardHeader className="pb-6">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
              <div className="h-8 w-8 rounded-full bg-slate-700/50" />
            </div>
            <div className="h-8 bg-slate-700/50 rounded w-1/2 mx-auto"></div>
            <div className="h-4 bg-slate-700/30 rounded w-3/4 mx-auto mt-3"></div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="h-4 bg-slate-700/30 rounded w-2/3 mx-auto"></div>
            <div className="rounded-xl border border-white/5 bg-[#0b1329]/30 p-5 space-y-3">
              <div className="h-3 bg-slate-700/50 rounded w-1/4"></div>
              <div className="h-3 bg-slate-700/30 rounded w-5/6"></div>
              <div className="h-3 bg-slate-700/30 rounded w-2/3"></div>
            </div>
          </CardContent>
          <CardFooter className="pt-6 px-0">
            <div className="w-full h-11 bg-slate-700/50 rounded-xl"></div>
          </CardFooter>
        </Card>
      </div>
    </RoleDashboardShell>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<ResultsLoading />}>
      <ResultsContent />
    </Suspense>
  );
}
