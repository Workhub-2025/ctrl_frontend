import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const workstreams = [
  {
    title: "Candidate review queue",
    description:
      "Prepare this space for completed assessments waiting for structured review and recruiter decisioning.",
  },
  {
    title: "Evidence-led shortlist",
    description:
      "Surface candidate comparisons, role fit, and defensible recommendations once the hybrid outputs are connected.",
  },
  {
    title: "Assessment operations",
    description:
      "Monitor completion progress, identify stalled candidates, and keep recruitment operations moving without noise.",
  },
];

export const metadata = {
  title: "Hiring Manager Dashboard",
};

export default function HiringManagerDashboardPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <Badge variant="outline">Hiring manager view</Badge>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold font-headline text-foreground">
            Review candidates with structure and confidence
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
            This dashboard is the future home for recruiter and hiring manager
            decision support. It is now separated cleanly from the candidate
            experience so evidence, ranking, and shortlist logic can be added
            without leaking into the assessment journey.
          </p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {workstreams.map((item) => (
          <Card key={item.title} id={item.title.toLowerCase().replace(/\s+/g, "-")}>
            <CardHeader>
              <CardTitle className="text-base">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card id="queue">
          <CardHeader>
            <CardTitle>Review queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Assessment submissions will flow here once backend persistence is switched on.</p>
            <p>Next phase: connect recruiter review cards, completion timestamps, and candidate readiness signals.</p>
          </CardContent>
        </Card>
        <Card id="shortlist">
          <CardHeader>
            <CardTitle>Shortlist workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Reserved for comparison views, structured notes, and final decision summaries.</p>
            <p id="candidates">This gives the hiring team a dedicated place to work without using admin screens as a substitute.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
