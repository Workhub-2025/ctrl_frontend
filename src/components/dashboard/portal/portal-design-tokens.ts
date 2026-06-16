import { cn } from "@/lib/utils";

/** Shared surface styles for every CTRL portal (admin, client, HM, candidate). */
export const portalPanelClass =
  "rounded-xl border border-border/60 bg-card/60 shadow-sm dark:border-white/8 dark:bg-[#0b1329]/30";

export const portalStatTileClass = cn(portalPanelClass, "p-4");

export const portalIconWrapClass =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary";

export const portalIconWrapLgClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary";

export const portalTableShellClass = cn(portalPanelClass, "overflow-hidden");

export const portalTableToolbarClass =
  "flex flex-col gap-3 border-b border-border/50 bg-muted/20 p-4 dark:border-white/6 dark:bg-black/10 sm:flex-row sm:items-center sm:justify-between";

export const portalTableHeaderClass =
  "bg-muted/25 dark:bg-black/15 [&_tr]:border-b [&_tr]:border-border/50 dark:[&_tr]:border-white/6";

export const portalTableRowClass =
  "border-b border-border/40 transition-colors hover:bg-muted/25 dark:border-white/6 dark:hover:bg-white/[0.02]";

export const portalInputClass =
  "rounded-lg border-border/70 bg-background dark:border-white/10";

export const portalFilterChipActiveClass =
  "rounded-lg border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm";

export const portalFilterChipClass =
  "rounded-lg border border-border/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 dark:border-white/8";

/** One badge style for all statuses — colour is not used for categorisation. */
export const portalBadgeClass =
  "rounded-md border border-border/60 bg-muted/35 px-2 py-0.5 text-xs font-medium text-foreground dark:border-white/10 dark:bg-white/[0.04]";

export const portalAlertErrorClass =
  "rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive";

export const portalAlertInfoClass =
  "rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground";

export const portalLabelClass =
  "text-xs font-medium uppercase tracking-wide text-muted-foreground";

export function portalStatusBadge(_status?: string) {
  return portalBadgeClass;
}
