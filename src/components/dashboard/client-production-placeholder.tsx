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

      <Card className="relative overflow-hidden rounded-xl border border-border bg-card dark:border-white/10 dark:bg-[#0b1329]/40 dark:backdrop-blur-md shadow-lg p-5">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-indigo-500" />
        <CardHeader className="space-y-3 p-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
            <Clock3 className="h-[18px] w-[18px]" />
          </div>
          <div className="space-y-1.5">
            <Badge className="w-fit rounded-md border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              Roadmap Feature
            </Badge>
            <CardTitle className="text-xl font-bold text-foreground">This area is currently under construction</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
            This module is part of the upcoming platform release. Real-time updates, additional data telemetry, and user management features will be automatically deployed when the production release is live.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
