"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import {
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  portalDialogContentLayoutClass,
  portalDialogShellClass,
  portalIconWrapLgClass,
  portalPageHeaderClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";

export const portalDetailDialogContentClass = cn(
  portalDialogShellClass,
  portalDialogContentLayoutClass,
  "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
);

type PortalDetailHeaderProps = {
  layout: "dialog" | "page";
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  badges?: ReactNode;
  metadata?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  actions?: ReactNode;
};

export function PortalDetailHeader({
  layout,
  eyebrow,
  title,
  icon: Icon,
  badges,
  metadata,
  onClose,
  closeLabel = "Close",
  actions,
}: PortalDetailHeaderProps) {
  const TitleTag = layout === "page" ? "h1" : DialogTitle;

  const headerInner = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3.5">
        <span className={cn(portalIconWrapLgClass, "mt-0.5")} aria-hidden="true">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            {eyebrow}
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <TitleTag className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
              {title}
            </TitleTag>
            {badges}
          </div>
          {metadata}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {actions}
        {layout === "dialog" && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={closeLabel}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );

  if (layout === "page") {
    return (
      <header className={cn(portalPageHeaderClass, "mb-0 border-b-0 pb-0 text-left")}>
        {headerInner}
      </header>
    );
  }

  return (
    <DialogHeader className={cn(portalPageHeaderClass, "mb-0 border-b-0 pb-0 text-left")}>
      {headerInner}
    </DialogHeader>
  );
}
