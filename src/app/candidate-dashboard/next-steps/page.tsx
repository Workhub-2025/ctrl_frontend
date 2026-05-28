import {
  Building2,
  CheckCircle2,
  Clock3,
  Headphones,
  Laptop,
  MapPin,
  Route,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";

const guidance = [
  {
    title: "In-person campaigns",
    description: "Attend the location and time provided by the Hiring Manager.",
    icon: Building2,
    points: [
      "Bring anything requested in the invite, such as identification or right-to-work documents.",
      "Your assessment access may be issued or checked by staff when you arrive.",
      "If you are delayed, contact the Hiring Manager directly.",
    ],
  },
  {
    title: "Remote campaigns",
    description: "Complete your assigned assessments from a quiet, stable setup.",
    icon: Laptop,
    points: [
      "Use a reliable internet connection and a device you are comfortable typing on.",
      "Keep the assessment tab open until each assessment confirms it has been submitted.",
      "Avoid refreshing or closing the browser while an assessment is in progress.",
    ],
  },
  {
    title: "Hybrid campaigns",
    description: "Some steps may happen online and some may happen in person.",
    icon: Route,
    points: [
      "Check each campaign card for the location, date, and assessment status.",
      "Complete any online assessments before attending the in-person stage where requested.",
      "Use the same Candidate Portal account for every campaign session you join.",
    ],
  },
];

const processSteps = [
  {
    title: "Join a campaign",
    body: "Enter the access code supplied by the Hiring Manager. Each valid campaign should appear in My Campaigns.",
    icon: MapPin,
  },
  {
    title: "Complete assigned assessments",
    body: "Open the campaign, complete each available assessment, and wait for the submission confirmation screen.",
    icon: CheckCircle2,
  },
  {
    title: "Wait for contact",
    body: "Scores and hiring decisions are not shown in the Candidate Portal. The recruitment team will contact you directly.",
    icon: Clock3,
  },
];

export default function NextStepsPage() {
  return (
    <div className="max-w-6xl space-y-6">
      <DashboardPageHeader
        title="What To Do Next"
        description="How campaign access, assessment completion, and recruiter follow-up works."
      />

      <section className="grid gap-4 lg:grid-cols-3">
        {processSteps.map((step, index) => (
          <Card
            key={step.title}
            className="border-border bg-card shadow-sm dark:border-white/5 dark:bg-[#080c16]/60 dark:shadow-none"
          >
            <CardHeader>
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Step {index + 1}
                </span>
              </div>
              <CardTitle className="text-lg">{step.title}</CardTitle>
              <CardDescription>{step.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {guidance.map((item) => (
          <Card
            key={item.title}
            className="border-border bg-card shadow-sm dark:border-white/5 dark:bg-[#080c16]/60 dark:shadow-none"
          >
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {item.points.map((point) => (
                <div key={point} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>{point}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="border-blue-500/20 bg-blue-500/5 shadow-none dark:bg-blue-500/10">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <CardTitle className="text-lg">Submission and support</CardTitle>
          <CardDescription>
            Once an assessment is submitted, it is sent securely for review. If something goes wrong, use Help & Support or contact the Hiring Manager.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1 dark:bg-[#04070d]">
            <Headphones className="h-4 w-4 text-primary" />
            Technical issue
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1 dark:bg-[#04070d]">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Submitted securely
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
