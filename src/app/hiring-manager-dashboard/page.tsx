import { Badge } from "@/components/ui/badge";
import { Users, Send, CalendarDays } from "lucide-react";
import { DashboardNavCard } from "@/components/dashboard/dashboard-nav-card";

const workstreams = [
  {
    title: "Campaign & Session Management",
    description:
      "Create assessment campaigns, set up in-person session windows, and generate unique access codes for candidates.",
    icon: CalendarDays,
    href: "/hiring-manager-dashboard/campaigns/",
  },
  {
    title: "Candidate Review",
    description:
      "Evaluate candidates who have completed their session assessments and make decisions on their progression.",
    icon: Users,
    href: "/hiring-manager-dashboard/review/",
  },
  {
    title: "Client Handoff",
    description:
      "Forward successfully reviewed candidates directly to the client's dashboard for final interview consideration.",
    icon: Send,
    href: "/hiring-manager-dashboard/handoff/",
  },
];

/**
 * HiringManagerDashboardPage
 * 
 * The primary landing page for Hiring Managers. Displays the main workstreams
 * allowing them to manage campaigns, review candidates, and handoff to clients.
 */
export default function HiringManagerDashboardPage() {
  return (
    <div className="space-y-8 max-w-6xl">
      <section className="space-y-4">
        <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">Hiring manager view</Badge>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold font-headline text-foreground">
            Manage campaigns and progress top candidates
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
            As a Hiring Manager, you control the flow. Select a workspace below to create campaigns, generate 
            unique session codes for candidates, review completed submissions, or progress the best candidates to the client.
          </p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        {workstreams.map((item) => (
          <DashboardNavCard
            key={item.title}
            title={item.title}
            description={item.description}
            icon={item.icon}
            href={item.href}
          />
        ))}
      </div>
    </div>
  );
}