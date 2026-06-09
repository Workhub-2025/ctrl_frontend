import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { Clock3, Construction, ShieldCheck } from "lucide-react";

type ClientProductionPlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export function ClientProductionPlaceholder({
  eyebrow,
  title,
  description,
  icon,
}: ClientProductionPlaceholderProps) {
  return (
    <div className="max-w-7xl space-y-6">
      <HiringManagerPageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        icon={icon}
      />

      <Card className="rounded-[1.25rem] border border-border bg-card shadow-sm dark:border-white/5 dark:bg-[#080c16]/70 dark:shadow-none">
        <CardHeader className="space-y-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
            <Clock3 className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <Badge className="w-fit rounded-md border-orange-500/20 bg-orange-500/10 text-orange-600 hover:bg-orange-500/10">
              In Production
            </Badge>
            <CardTitle className="text-xl text-foreground">This page is being prepared</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            This section is part of the client portal roadmap and will be available later.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
