"use client";

import type { LucideIcon } from "lucide-react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ClientErrorBanner({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs leading-relaxed text-red-600 dark:text-red-200">
      {message}
    </p>
  );
}

export function ClientRefreshButton({
  onClick,
  loading,
  label = "Refresh",
}: {
  onClick: () => void;
  loading?: boolean;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-9 rounded-xl border-border text-foreground transition-colors hover:!bg-muted hover:!text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/10 dark:hover:!bg-white/[0.08] dark:hover:!text-white"
      onClick={onClick}
      disabled={loading}
    >
      <RefreshCw
        className={cn("mr-2 h-4 w-4", loading && "motion-safe:animate-spin text-primary")}
        aria-hidden="true"
      />
      {label}
    </Button>
  );
}

export function ClientQuickLink({
  href,
  icon: Icon,
  title,
  description,
  badge,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string | number;
}) {
  return (
    <a
      href={href}
      className="group flex items-start gap-4 rounded-2xl border border-border/60 bg-background/40 p-4 transition-colors hover:border-primary/30 dark:border-white/5 dark:bg-[#0b1220]/25 dark:hover:border-white/15"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-display text-sm font-semibold text-foreground">{title}</span>
          {badge !== undefined && Number(badge) > 0 ? (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-300">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>
    </a>
  );
}
