import { cn } from "@/lib/utils";

/** Shared fill and border for every CTRL portal surface. */
export const portalPanelBaseClass =
  "border border-border bg-card";

/** Border colour for nested panels, card headers, and internal dividers. */
export const portalPanelBorderClass = "border-border";

/**
 * Standard portal panel/card — light-theme elevation so surfaces stand off the page.
 * Static sections only; use {@link portalPanelInteractiveClass} for clickable surfaces.
 */
export const portalPanelClass = cn(
  portalPanelBaseClass,
  "rounded-lg transition-colors duration-150",
);

/** Clickable portal panel — links, buttons, and cards with an onClick handler. */
export const portalPanelInteractiveClass = cn(
  portalPanelClass,
  "hover:border-primary/45 focus-within:border-primary/55",
);

/** Primary list / content cards — same elevation with larger radius. */
export const portalCardClass = portalPanelClass;

/** Clickable list / content cards. */
export const portalCardInteractiveClass = portalPanelInteractiveClass;

/** Stronger panel surface for hero cards and primary sections. */
export const portalPanelElevatedClass = cn(
  portalCardClass,
  "border-border",
);

/** Clickable elevated panel — e.g. whole-card navigation. */
export const portalPanelElevatedInteractiveClass = cn(
  portalPanelElevatedClass,
  "hover:border-primary/40",
);

/** Nested panel surface inside elevated cards — flat, no extra shadow. */
export const portalPanelNestedClass = cn(
  portalPanelBaseClass,
  "rounded-lg bg-muted/20 shadow-none transition-colors",
);

/** Dashed empty-state surface for lists and filter results. */
export const portalEmptyPanelClass = cn(
  portalPanelNestedClass,
  "rounded-lg border-dashed p-4 text-center text-sm text-muted-foreground sm:p-6"
);

/** Primary decision surface with a restrained CTRL evidence rail. */
export const portalHeroPanelClass = cn(
  portalPanelElevatedClass,
  "relative overflow-hidden border-l-2 border-l-primary/70"
);

/** Unselected selectable option card — delivery-mode pattern, readable on light and dark. */
export const portalSelectableCardClass = cn(
  "rounded-lg border transition-colors duration-150",
  "border-border bg-background text-muted-foreground",
  "hover:border-primary/30 hover:bg-muted/20",
  "dark:text-muted-foreground"
);

/** Selected selectable option card — clear state without glow. */
export const portalSelectableCardSelectedClass = cn(
  "rounded-lg border border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/20 transition-colors duration-150"
);

/** Group wrapper for a cluster of selectable cards (e.g. delivery mode section). */
export const portalSelectableCardGroupClass =
  "rounded-lg border border-border bg-muted/20 p-4";

/** Large portal dialog shell — theme-aware, matches default DialogContent + portal panels. */
export const portalDialogShellClass =
  "overflow-hidden rounded-lg border border-border bg-background text-foreground shadow-lg";

/** Radix Sheet built-in close control — readable in light and dark themes. */
export const portalSheetCloseButtonClass =
  "[&>button]:text-muted-foreground [&>button]:opacity-100 [&>button]:transition-colors [&>button]:hover:text-foreground dark:[&>button]:hover:text-white";

/** Layout helper for full-width HM detail dialogs. */
export const portalDialogContentLayoutClass =
  "flex h-[min(86dvh,900px)] max-h-[86dvh] w-[min(92vw,1280px)] max-w-none flex-col gap-0 p-0 [&>button]:hidden";

/** Tooltip surface shared across portal score breakdowns and disabled controls. */
export const portalTooltipContentClass =
  "ctrl-tooltip z-50 max-w-xs rounded-md border border-border bg-popover px-3 py-2.5 text-sm text-popover-foreground shadow-md";

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
  "h-full rounded-full bg-primary transition-[width] duration-300";

/** Primary gradient action button shared across HM portal views. */
export const portalPrimaryButtonClass =
  "rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90";

/** Muted chat / transcript bubble in dark panels. */
export const portalMutedBubbleClass =
  "border-border bg-muted/30 text-foreground hover:border-primary/30";

/** Dark inset surface for code / transcript blocks in reports. */
export const portalCodeSurfaceClass =
  "overflow-x-auto rounded-lg border border-border bg-muted/30";

/** Semantic score meter (low → high) for integrity and composite scores. */
export const portalScoreMeterClass =
  "h-full rounded-full bg-primary transition-[width] duration-300";

/** Positive action button (approve, confirm) in HM reports. */
export const portalSuccessButtonClass =
  "rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-500";

export const portalStatTileClass = cn(portalPanelClass, "p-4 sm:p-5");

export const portalIconWrapClass =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary";

export const portalIconWrapLgClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary";

export const portalTableShellClass = cn(portalPanelClass, "overflow-hidden");

export const portalTableToolbarClass =
  "flex flex-col gap-3 border-b border-border bg-muted/25 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4";

export const portalTableHeaderClass =
  "bg-muted/35 [&_tr]:border-b [&_tr]:border-border";

export const portalTableRowClass =
  "border-b border-border transition-colors hover:bg-muted/30";

export const portalInputClass =
  "rounded-md border-input bg-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";

export const portalFilterChipActiveClass =
  "inline-flex min-h-9 items-center rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary";

export const portalFilterChipClass =
  "inline-flex min-h-9 items-center rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground";

/** One badge style for all statuses — colour is not used for categorisation. */
export const portalBadgeClass =
  "rounded-sm border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground";

export const portalAlertErrorClass =
  "rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive";

export const portalAlertWarningClass =
  "rounded-md border border-amber-500/45 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-50";

export const portalAlertInfoClass =
  "rounded-md border border-primary/35 bg-primary/5 px-4 py-3 text-sm text-foreground";

export const portalLabelClass =
  "text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground";

/** Supporting copy between compact labels and standard body text. */
export const portalSupportingTextClass =
  "text-sm leading-relaxed text-muted-foreground";

/** Page header wrapper — separates title block from main content across portals. */
export const portalPageHeaderClass =
  "mb-5 space-y-4 border-b border-border pb-5 sm:mb-7 sm:pb-6";

export function portalStatusBadge(_status?: string) {
  return portalBadgeClass;
}

/** Outer container for in-browser assessment flows (game shell). */
export const portalAssessmentShellClass = cn(
  portalCardClass,
  "overflow-hidden shadow-sm",
);

/** Assessment shell header strip. */
export const portalAssessmentShellHeaderClass =
  "flex flex-col gap-3 border-b border-border/60 bg-muted/25 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-white/10 dark:bg-white/[0.025]";

/** Assessment shell body — quiet solid surface for task focus. */
export const portalAssessmentShellBodyClass =
  "flex flex-1 bg-background px-4 py-5 sm:px-6 sm:py-6 xl:px-8";

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
