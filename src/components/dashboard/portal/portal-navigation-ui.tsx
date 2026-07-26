import Link from "next/link";
import type { ReactNode } from "react";
import { Check, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type PortalDetailTab = Readonly<{
  id: string;
  label: string;
  href: string;
  count?: number;
}>;

export function PortalDetailTabs({
  label,
  tabs,
  activeId,
}: Readonly<{
  label: string;
  tabs: readonly PortalDetailTab[];
  activeId: string;
}>) {
  return (
    <nav aria-label={label} className="overflow-x-auto border-b border-border">
      <ul className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <li key={tab.id}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {tab.label}
                {typeof tab.count === "number" ? (
                  <span className="min-w-5 rounded-sm bg-muted px-1.5 py-0.5 text-center text-xs tabular-nums">
                    {tab.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export type PortalStep = Readonly<{
  id: string;
  label: string;
  description?: string;
  complete?: boolean;
}>;

/**
 * Numbered step nav for multi-part portal forms. Steps stay clickable in both
 * directions so a reviewer can jump back without losing draft state.
 */
export function PortalStepper({
  label,
  steps,
  activeId,
  onSelect,
}: Readonly<{
  label: string;
  steps: readonly PortalStep[];
  activeId: string;
  onSelect: (id: string) => void;
}>) {
  return (
    <nav aria-label={label} className="overflow-x-auto">
      <ol className="flex min-w-max gap-2 sm:min-w-0">
        {steps.map((step, index) => {
          const active = step.id === activeId;
          return (
            <li key={step.id} className="flex-1">
              <button
                type="button"
                onClick={() => onSelect(step.id)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-primary/60 bg-primary/10"
                    : "border-border bg-card hover:border-primary/30 hover:bg-muted/20",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                    step.complete
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : active
                        ? "border-primary/50 text-primary"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {step.complete ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                  <span className="sr-only">
                    {step.complete ? "Step complete" : `Step ${index + 1}`}
                  </span>
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block truncate text-sm font-semibold",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                  {step.description ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {step.description}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export type PortalActionMenuItem = Readonly<{
  id: string;
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  tone?: "default" | "destructive";
  disabled?: boolean;
  separatorBefore?: boolean;
}>;

export function PortalActionMenu({
  label,
  items,
}: Readonly<{
  label: string;
  items: readonly PortalActionMenuItem[];
}>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="h-11 w-11" aria-label={label}>
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => (
          <div key={item.id}>
            {item.separatorBefore ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              disabled={item.disabled}
              onSelect={item.onSelect}
              className={cn(
                "min-h-10 gap-2",
                item.tone === "destructive" && "text-destructive focus:text-destructive",
              )}
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
