import { Badge } from "@/components/ui/badge";
import { UserCheck, MessageSquare } from "lucide-react";
import { DashboardNavCard } from "@/components/dashboard/dashboard-nav-card";

const pipelineCards = [
  {
    title: "Progressed Candidates",
    body: "Review the top candidates that have been evaluated and forwarded by your Hiring Manager.",
    icon: UserCheck,
    href: "/client-dashboard/progressed/",
  },
  {
    title: "HM Communications",
    body: "Send and receive direct messages with your Hiring Manager regarding candidate progression and interviews.",
    icon: MessageSquare,
    href: "/client-dashboard/messages/",
  },
];

/**
 * ClientDashboardPage
 * 
 * The primary landing page for Clients. Displays quick navigation to view
 * progressed candidates and direct communications with the Hiring Manager.
 */
export default function ClientDashboardPage() {
  return (
    <div className="space-y-8 max-w-6xl">
      <section className="space-y-4">
        <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">Client view</Badge>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold font-headline text-foreground">
            Review progressed candidates and interviews
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
            This dashboard provides direct access to the candidates your Hiring Manager 
            has successfully reviewed and progressed. Select a workspace below to review profiles or communicate 
            with your HM directly.
          </p>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        {pipelineCards.map((card) => (
          <DashboardNavCard
            key={card.title}
            title={card.title}
            description={card.body}
            icon={card.icon}
            href={card.href}
          />
        ))}
      </div>
    </div>
  );
}