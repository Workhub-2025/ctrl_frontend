"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  portalDialogShellClass,
  portalIconWrapClass,
  portalPanelClass,
  portalSheetCloseButtonClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";

type PortalSidePanelWidth = "sm" | "md" | "lg" | "xl";

const sidePanelWidth: Record<PortalSidePanelWidth, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-xl",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-[min(92vw,72rem)]",
};

export function PortalSidePanel({
  open,
  onOpenChange,
  title,
  description,
  eyebrow,
  icon: Icon,
  width = "md",
  children,
  footer,
  bodyClassName,
  contentClassName,
  trigger,
  header,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  width?: PortalSidePanelWidth;
  children: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
  contentClassName?: string;
  trigger?: ReactNode;
  /** Custom header for complex record workspaces that already provide a DialogTitle. */
  header?: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent
        className={cn(
          portalDialogShellClass,
          portalSheetCloseButtonClass,
          "flex h-dvh w-full flex-col gap-0 border-l p-0",
          sidePanelWidth[width],
          contentClassName
        )}
      >
        {header !== undefined ? (
          header
        ) : (
          <SheetHeader className="shrink-0 border-b border-border bg-card px-5 py-5 pr-16 text-left sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
              {Icon ? (
                <span className={cn(portalIconWrapClass, "mt-0.5")} aria-hidden="true">
                  <Icon className="h-4 w-4" />
                </span>
              ) : null}
              <div className="min-w-0 space-y-1">
                {eyebrow ? (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                    {eyebrow}
                  </p>
                ) : null}
                <SheetTitle className="text-left text-lg font-semibold tracking-tight text-foreground">
                  {title}
                </SheetTitle>
                {description ? (
                  <SheetDescription className="max-w-xl text-left text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </SheetDescription>
                ) : null}
              </div>
            </div>
          </SheetHeader>
        )}

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6",
            bodyClassName
          )}
          data-portal-side-panel-body
        >
          {children}
        </div>

        {footer ? (
          <footer className="shrink-0 border-t border-border bg-card px-5 py-4 sm:px-6">
            {footer}
          </footer>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export function PortalLockedPane({
  aside,
  asideLabel,
  children,
  className,
  asideClassName,
  contentClassName,
}: {
  aside: ReactNode;
  asideLabel: string;
  children: ReactNode;
  className?: string;
  asideClassName?: string;
  contentClassName?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-5 xl:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] xl:items-start",
        className
      )}
    >
      <aside
        aria-label={asideLabel}
        className={cn(
          portalPanelClass,
          "p-4 xl:sticky xl:top-20 xl:max-h-[calc(100dvh-6rem)] xl:overflow-y-auto xl:overscroll-contain",
          asideClassName
        )}
      >
        {aside}
      </aside>
      <div className={cn("min-w-0", contentClassName)}>{children}</div>
    </div>
  );
}
