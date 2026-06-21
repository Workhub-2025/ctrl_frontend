'use client';

import { Suspense } from 'react';
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
import { PortalMinimalShell } from '@/components/dashboard/portal/portal-minimal-shell';
import {
  portalHeroPanelClass,
  portalPanelNestedClass,
  portalPrimaryButtonClass,
} from '@/components/dashboard/portal/portal-design-tokens';
import { cn } from '@/lib/utils';

function ResultsContent() {
  const searchParams = useSearchParams();
  const test = searchParams.get('test');

  const getTestName = () => {
    switch (test) {
      case 'typing':
        return 'Typing Assessment';
      case 'call-simulation':
        return 'Call Simulation';
      case 'situational-judgement':
        return 'Situational Judgement Assessment';
      default:
        return 'Assessment';
    }
  };

  return (
    <PortalMinimalShell
      homeHref="/candidate-dashboard"
      title="Assessment Complete"
      subtitle="Your responses have been saved and verified"
      maxWidthClass="max-w-xl"
    >
      <div className="relative flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center overflow-hidden p-4 sm:p-8">
        <div className="pointer-events-none absolute top-1/4 right-1/4 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-1/4 left-1/4 -z-10 h-[350px] w-[350px] rounded-full bg-indigo-500/5 blur-[120px]" />

        <Card className={cn(portalHeroPanelClass, 'relative w-full overflow-hidden p-6 text-center sm:p-8')}>
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />

          <CardHeader className="relative pb-6">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.12)]">
              <PartyPopper className="h-8 w-8" />
            </div>
            <CardTitle className="font-display text-3xl font-black tracking-tight text-foreground">
              {getTestName()} Complete!
            </CardTitle>
            <CardDescription className="mx-auto mt-1.5 max-w-sm text-sm">
              Your assessment responses have been securely received and processed.
            </CardDescription>
          </CardHeader>

          <CardContent className="relative space-y-6">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <p className="text-sm font-medium">Thank you for completing this assessment.</p>
            </div>

            <div className={cn(portalPanelNestedClass, 'space-y-3 p-5 text-left')}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Submission status
                </p>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Received &amp; Verified
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Your assessment has been submitted successfully.
              </p>
              <p className="border-t border-border/50 pt-3 text-xs leading-relaxed text-muted-foreground dark:border-white/5">
                The hiring team will review your results and contact you directly if they wish to
                progress your application.
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              You can now safely return to your candidate portal dashboard.
            </p>
          </CardContent>

          <CardFooter className="relative px-0 pt-6">
            <Button asChild className={cn(portalPrimaryButtonClass, 'h-11 w-full font-bold')} size="lg">
              <Link href="/candidate-dashboard">Return to My Assessments</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PortalMinimalShell>
  );
}

function ResultsLoading() {
  return (
    <PortalMinimalShell
      homeHref="/candidate-dashboard"
      title="Loading Results"
      subtitle="Verifying and submitting your results..."
      maxWidthClass="max-w-xl"
    >
      <div className="relative flex min-h-[calc(100vh-10rem)] animate-pulse flex-col items-center justify-center overflow-hidden p-4 sm:p-8">
        <Card className={cn(portalHeroPanelClass, 'w-full overflow-hidden p-6 text-center sm:p-8')}>
          <CardHeader className="pb-6">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-muted/40">
              <div className="h-8 w-8 rounded-full bg-muted" />
            </div>
            <div className="mx-auto h-8 w-1/2 rounded bg-muted" />
            <div className="mx-auto mt-3 h-4 w-3/4 rounded bg-muted/70" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="mx-auto h-4 w-2/3 rounded bg-muted/70" />
            <div className={cn(portalPanelNestedClass, 'space-y-3 p-5')}>
              <div className="h-3 w-1/4 rounded bg-muted" />
              <div className="h-3 w-5/6 rounded bg-muted/70" />
              <div className="h-3 w-2/3 rounded bg-muted/70" />
            </div>
          </CardContent>
          <CardFooter className="px-0 pt-6">
            <div className="h-11 w-full rounded-xl bg-muted" />
          </CardFooter>
        </Card>
      </div>
    </PortalMinimalShell>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<ResultsLoading />}>
      <ResultsContent />
    </Suspense>
  );
}
