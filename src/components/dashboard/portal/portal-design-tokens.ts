import { cn } from "@/lib/utils";

/** Shared fill and border for every CTRL portal surface. */
export const portalPanelBaseClass =
  "border border-border/60 bg-card/60 dark:border-white/8 dark:bg-[#0b1329]/30";

/** Border colour for nested panels, card headers, and internal dividers. */
export const portalPanelBorderClass = "border-border/60 dark:border-white/10";

/** Subtle lift on dark portal backgrounds (~#080c16) — mirrors light `shadow-lg` without glow. */
const portalDarkPanelShadowClass = "dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]";
const portalDarkElevatedShadowClass = "dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)]";

/**
 * Standard portal panel/card — light-theme elevation so surfaces stand off the page.
 * Static sections only; use {@link portalPanelInteractiveClass} for clickable surfaces.
 */
export const portalPanelClass = cn(
  portalPanelBaseClass,
  "rounded-xl shadow-lg transition-all duration-300",
  portalDarkPanelShadowClass,
);

/** Clickable portal panel — links, buttons, and cards with an onClick handler. */
export const portalPanelInteractiveClass = cn(
  portalPanelClass,
  "hover:border-primary/30 dark:hover:border-white/12",
);

/** Primary list / content cards — same elevation with larger radius. */
export const portalCardClass = cn(portalPanelClass, "rounded-2xl");

/** Clickable list / content cards. */
export const portalCardInteractiveClass = cn(portalPanelInteractiveClass, "rounded-2xl");

/** Stronger panel surface for hero cards and primary sections. */
export const portalPanelElevatedClass = cn(
  portalCardClass,
  "backdrop-blur-md shadow-2xl dark:border-white/10 dark:bg-[#0b1329]/45",
  portalDarkElevatedShadowClass,
);

/** Clickable elevated panel — e.g. whole-card navigation. */
export const portalPanelElevatedInteractiveClass = cn(
  portalPanelElevatedClass,
  "hover:border-primary/30 dark:hover:border-primary/30",
);

/** Nested panel surface inside elevated cards — flat, no extra shadow. */
export const portalPanelNestedClass = cn(
  portalPanelBaseClass,
  "rounded-xl shadow-none transition-colors dark:border-white/10 dark:bg-[#0b1329]/20",
);

/** Dashed empty-state surface for lists and filter results. */
export const portalEmptyPanelClass = cn(
  portalPanelNestedClass,
  "rounded-[1.25rem] border-dashed p-6 text-center text-sm text-muted-foreground"
);

/** Gradient hero card used on report and campaign headers. */
export const portalHeroPanelClass = cn(
  portalPanelElevatedClass,
  "relative overflow-hidden dark:border-white/10 dark:bg-gradient-to-br dark:from-[#0e172e]/80 dark:to-[#0b1329]/50 dark:backdrop-blur-md"
);

/** Unselected selectable option card — delivery-mode pattern, readable on light and dark. */
export const portalSelectableCardClass = cn(
  "rounded-xl border transition-all duration-300",
  "border-border/70 bg-background/50 text-muted-foreground",
  "hover:border-primary/30 hover:bg-muted/20",
  "dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400",
  "dark:hover:border-primary/30 dark:hover:bg-white/[0.05] dark:hover:text-slate-300"
);

/** Selected selectable option card — light primary tint with soft glow. */
export const portalSelectableCardSelectedClass = cn(
  "rounded-xl border transition-all duration-300",
  "border-primary/45 bg-primary/10 text-foreground shadow-[0_0_15px_rgba(99,102,241,0.1)] ring-1 ring-primary/20",
  "dark:text-white"
);

/** Group wrapper for a cluster of selectable cards (e.g. delivery mode section). */
export const portalSelectableCardGroupClass =
  "rounded-xl border border-border/60 bg-muted/20 p-4 dark:border-white/10 dark:bg-white/[0.02]";

/** Large portal dialog shell — theme-aware, matches default DialogContent + portal panels. */
export const portalDialogShellClass =
  "overflow-hidden rounded-[1.25rem] border border-border/60 bg-background/95 text-foreground shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-[#070b14]/90 dark:backdrop-blur-xl dark:shadow-[0_32px_96px_rgba(0,0,0,0.45)]";

/** Radix Sheet built-in close control — readable in light and dark themes. */
export const portalSheetCloseButtonClass =
  "[&>button]:text-muted-foreground [&>button]:opacity-100 [&>button]:transition-colors [&>button]:hover:text-foreground dark:[&>button]:hover:text-white";

/** Layout helper for full-width HM detail dialogs. */
export const portalDialogContentLayoutClass =
  "flex h-[min(86dvh,900px)] max-h-[86dvh] w-[min(92vw,1280px)] max-w-none flex-col gap-0 p-0 [&>button]:hidden";

/** Tooltip surface shared across portal score breakdowns and disabled controls. */
export const portalTooltipContentClass =
  "ctrl-tooltip z-50 max-w-xs rounded-lg border border-border/60 bg-popover px-3 py-2.5 text-sm text-popover-foreground shadow-md dark:border-white/10";

/** Positioning helper for CSS hover tooltips (non-Radix). */
export const portalHoverTooltipClass =
  "pointer-events-none absolute z-50 hidden group-hover:block";

/** Arrow pseudo-element for CSS hover tooltips. */
export const portalHoverTooltipArrowClass =
  "before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:content-[''] before:[border-top-color:hsl(var(--popover))]";

/** Default above-target CSS hover tooltip (combine with width utilities as needed). */
export const portalCssHoverTooltipClass = cn(
  portalTooltipContentClass,
  portalHoverTooltipClass,
  "bottom-full left-1/2 mb-2 -translate-x-1/2",
  portalHoverTooltipArrowClass
);

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

/** Page header wrapper — separates title block from main content across portals. */
export const portalPageHeaderClass =
  "mb-7 space-y-4 border-b border-border/60 pb-6 dark:border-white/6";

export function portalStatusBadge(_status?: string) {
  return portalBadgeClass;
}

/** Outer container for in-browser assessment flows (game shell). */
export const portalAssessmentShellClass = cn(
  portalCardClass,
  "overflow-hidden shadow-xl shadow-black/10",
  portalDarkElevatedShadowClass,
);

/** Assessment shell header strip. */
export const portalAssessmentShellHeaderClass =
  "flex flex-col gap-3 border-b border-border/60 bg-muted/25 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-white/10 dark:bg-white/[0.025]";

/** Assessment shell body — theme gradient without hardcoded hex stops. */
export const portalAssessmentShellBodyClass =
  "flex flex-1 bg-gradient-to-br from-background to-muted/40 px-4 py-5 sm:px-6 sm:py-6 xl:px-8 dark:from-background dark:to-muted/20";

/** Compact stat / info tile inside assessment screens. */
export const portalAssessmentTileClass = cn(portalPanelNestedClass, "p-4");

/** Assessment tile with light shadow (welcome / overview panels). */
export const portalAssessmentTileShadowClass = cn(portalAssessmentTileClass, "shadow-sm");

/** Larger assessment section card. */
export const portalAssessmentSectionClass = cn(portalPanelClass, "p-5 shadow-sm");

/** Hero-sized assessment section (welcome overview). */
export const portalAssessmentSectionLgClass = cn(portalPanelClass, "p-6 shadow-sm");

/** Nested inset block inside assessment sections. */
export const portalAssessmentInsetClass = cn(
  portalPanelNestedClass,
  "rounded-lg bg-background/80 p-3 text-center"
);

/** Collapsible preview panel in campaign builder assessment stack. */
export const portalAssessmentPreviewDetailsClass = cn(
  portalPanelNestedClass,
  "rounded-lg text-xs text-muted-foreground"
);
