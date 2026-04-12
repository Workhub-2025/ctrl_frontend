import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, ClipboardList, LifeBuoy, ShieldCheck } from "lucide-react";
import {
  candidateAssessmentItems,
  candidateGuidanceItems,
  candidateSupportLinks,
  completionLabels,
} from "@/components/dashboard/candidate-dashboard-data";

export function CandidateDashboardContent({
  completedKey,
}: {
  completedKey?: string;
}) {
  const completedAssessment = completedKey
    ? completionLabels[completedKey]
    : null;

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <Card className="rounded-3xl border-white/10 bg-white/[0.04] shadow-[0_32px_80px_rgba(2,6,23,0.2)]">
          <CardHeader className="space-y-4">
            <Badge variant="outline" className="w-fit border-primary/30 bg-primary/8">
              Candidate overview
            </Badge>
            <div className="space-y-3">
              <CardTitle className="text-3xl font-bold font-headline leading-tight text-foreground">
                Welcome to your assessment dashboard
              </CardTitle>
              <CardDescription className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                This is your main workspace. Start assessments, find support,
                and review the key information you need before continuing.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-sm font-medium text-foreground">
                My Assessments
              </p>
              <p className="mt-1 text-sm text-muted-foreground/90">
                Three sections ready to complete.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-sm font-medium text-foreground">Help & Support</p>
              <p className="mt-1 text-sm text-muted-foreground/90">
                Contact IT or the hiring manager if needed.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-sm font-medium text-foreground">Next Steps</p>
              <p className="mt-1 text-sm text-muted-foreground/90">
                Guidance for how to prepare and what happens after submission.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/[0.035]">
          <CardHeader>
            <CardTitle className="text-xl">At a glance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {candidateGuidanceItems.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/10 p-4"
              >
                <item.icon className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground/90">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {completedAssessment && (
        <Alert className="rounded-2xl border-primary/30 bg-primary/5">
          <AlertTitle>{completedAssessment} submitted</AlertTitle>
          <AlertDescription>
            Your assessment has been received. You can continue with the
            remaining sections whenever you are ready.
          </AlertDescription>
        </Alert>
      )}

      <section className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-3xl border-white/10 bg-white/[0.035]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <CardTitle className="text-lg">My Assessments</CardTitle>
            </div>
            <CardDescription>
              View all available assessments in one place.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {candidateAssessmentItems.map((assessment) => (
                <div
                  key={assessment.title}
                  className="rounded-2xl border border-white/10 bg-black/10 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      {assessment.title}
                    </p>
                    <Badge variant="outline">{assessment.duration}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground/90">
                    {assessment.status}
                  </p>
                </div>
              ))}
            </div>
            <Button asChild className="h-11 w-full rounded-xl">
              <Link href="/candidate-dashboard/my-assessments">
                Open My Assessments
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/[0.035]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-primary" />
              <CardTitle className="text-lg">Help & Support</CardTitle>
            </div>
            <CardDescription>
              Quick access to the right support channel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {candidateSupportLinks.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-black/10 p-4"
              >
                <p className="text-sm font-medium text-foreground">
                  {item.title}
                </p>
                <p className="mt-2 text-sm text-muted-foreground/90">
                  {item.description}
                </p>
              </div>
            ))}
            <Button asChild variant="outline" className="h-11 w-full rounded-xl border-white/12 bg-white/[0.02] hover:bg-white/[0.06]">
              <Link href="/candidate-dashboard/help-support">
                Open Help & Support
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/[0.035]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <CardTitle className="text-lg">Next Steps</CardTitle>
            </div>
            <CardDescription>
              Simple guidance before and after assessment completion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-muted-foreground/90">
              Choose a quiet place, take your time, and complete the sections in
              whichever order suits you.
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-muted-foreground/90">
              Once submitted, your responses move into internal review and the
              hiring team will contact you if they need anything further.
            </div>
            <Button asChild variant="outline" className="h-11 w-full rounded-xl border-white/12 bg-white/[0.02] hover:bg-white/[0.06]">
              <Link href="/candidate-dashboard/next-steps">
                View Next Steps
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
