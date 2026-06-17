import { cn } from "@/lib/utils";

/** Shared surface styles for every CTRL portal (admin, client, HM, candidate). */
export const portalPanelClass =
  "rounded-xl border border-border/60 bg-card/60 shadow-sm dark:border-white/8 dark:bg-[#0b1329]/30";

/** Stronger panel surface for hero cards and primary sections. */
export const portalPanelElevatedClass = cn(
  portalPanelClass,
  "backdrop-blur-md shadow-2xl dark:border-white/10 dark:bg-[#0b1329]/45"
);

/** Nested panel surface inside elevated cards. */
export const portalPanelNestedClass = cn(
  portalPanelClass,
  "dark:border-white/10 dark:bg-[#0b1329]/20"
);

/** Gradient hero card used on report and campaign headers. */
export const portalHeroPanelClass =
  "relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0e172e]/80 to-[#0b1329]/50 backdrop-blur-md shadow-xl dark:border-white/10";

/** Full-screen dialog / sheet shell for HM detail views. */
export const portalDialogShellClass =
  "overflow-y-auto rounded-[1.5rem] border border-white/10 bg-gradient-to-b from-[#0e172e] to-[#080c16]/95 text-slate-100 shadow-2xl backdrop-blur-md dark:border-white/10";

/** Progress bar fill used in occupancy and completion meters. */
export const portalProgressBarClass =
  "h-full rounded-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-500";

/** Primary gradient action button shared across HM portal views. */
export const portalPrimaryButtonClass =
  "rounded-xl bg-gradient-to-r from-indigo-500 to-primary text-sm font-semibold text-white transition-all duration-300 hover:opacity-95 shadow-[0_4px_20px_rgba(99,102,241,0.15)]";

/** Muted chat / transcript bubble in dark panels. */
export const portalMutedBubbleClass =
  "border-white/5 bg-[#0b1329]/50 text-slate-100 hover:border-white/10";

/** Dark inset surface for code / transcript blocks in reports. */
export const portalCodeSurfaceClass =
  "overflow-x-auto rounded-lg border border-white/15 bg-[#080d1a]/60";

/** Semantic score meter (low → high) for integrity and composite scores. */
export const portalScoreMeterClass =
  "h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-500";

/** Positive action button (approve, confirm) in HM reports. */
export const portalSuccessButtonClass =
  "rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 px-4 text-xs font-bold text-slate-950 transition-all hover:from-emerald-400 hover:to-teal-300 shadow-[0_0_15px_rgba(52,211,153,0.15)]";

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
