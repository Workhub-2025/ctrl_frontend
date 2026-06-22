import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { portalCardClass } from "@/components/dashboard/portal/portal-design-tokens";
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
    <Link href={href} className="block group">
      <Card className={cn(portalCardClass, "h-full transition-all hover:-translate-y-1")}>
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
            <Icon className="h-5 w-5" />
          </div>
          <CardTitle className="text-base text-foreground flex items-center justify-between">
            {title}
            <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </CardContent>
      </Card>
    </Link>
  );
}