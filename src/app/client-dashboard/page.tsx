import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const pipelineCards = [
  {
    title: "Assessment programme",
    body: "Track the shape of the assessment programme, candidate throughput, and delivery readiness without exposing internal scoring logic.",
  },
  {
    title: "Procurement-ready reporting",
    body: "See a clear view of structured process, consistency, and auditability for emergency control room hiring programmes.",
  },
  {
    title: "Decision assurance",
    body: "Review hiring evidence in a format that supports quality, fairness, and operational accountability.",
  },
];

export const metadata = {
  title: "Client Dashboard",
};

export default function ClientDashboardPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <Badge variant="outline">Client view</Badge>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold font-headline text-foreground">
            Client oversight for high-stakes recruitment
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
            This dashboard gives client stakeholders a clear operational view of
            programme delivery, candidate progress, and hiring governance. It is
            designed to surface confidence, not raw candidate scoring.
          </p>
        </div>
      </section>

      <div id="pipeline" className="grid gap-4 md:grid-cols-3">
        {pipelineCards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardTitle className="text-base">{card.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              {card.body}
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      <section
        id="governance"
        className="grid gap-6 rounded-2xl border bg-card/70 p-6 lg:grid-cols-[1.2fr_0.8fr]"
      >
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">
            Governance and defensibility
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Client stakeholders need a clear explanation of how CTRL supports a
            fair, structured, and operationally relevant recruitment process.
            This space is ready for future delivery metrics, defensibility
            summaries, and audit output.
          </p>
        </div>
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Current state</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Dashboard shell is live. Data feeds and reporting logic can now be
              wired in by role without changing the client-facing structure.
            </CardContent>
          </Card>
          <Card id="delivery">
            <CardHeader>
              <CardTitle className="text-sm">Next integration point</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Connect recruiter-reviewed outputs, programme summaries, and role
              specific KPIs once the backend reporting layer is ready.
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
