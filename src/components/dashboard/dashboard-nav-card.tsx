import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { portalCardInteractiveClass } from "@/components/dashboard/portal/portal-design-tokens";
import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Props for the DashboardNavCard component.
 */
interface DashboardNavCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

/**
 * DashboardNavCard Component
 * 
 * A reusable navigation card used across role-based dashboards (e.g., Hiring Manager, Client).
 * Displays an icon, title, description, and an interactive hover state with an arrow.
 * 
 * @param {DashboardNavCardProps} props - The card data including the destination link.
 */
export function DashboardNavCard({ title, description, icon: Icon, href }: DashboardNavCardProps) {
  return (
    <Link href={href} className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      <Card className={cn(portalCardInteractiveClass, "h-full")}>
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <CardTitle className="text-base text-foreground flex items-center justify-between">
            {title}
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </CardContent>
      </Card>
    </Link>
  );
}
