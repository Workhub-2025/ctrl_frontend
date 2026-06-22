import type { ReactNode } from "react";
import {
  portalLabelClass,
  portalPanelNestedClass,
  portalTableHeaderClass,
  portalTableRowClass,
  portalTableShellClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";

export function BreakdownStatTile({
  label,
  value,
  valueClassName,
  suffix,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  suffix?: ReactNode;
}) {
  return (
    <div className={cn(portalPanelNestedClass, "p-4")}>
      <p className={cn(portalLabelClass, "normal-case tracking-normal")}>{label}</p>
      <p className={cn("mt-1.5 text-2xl font-bold tabular-nums text-foreground", valueClassName)}>
        {value}
        {suffix ? (
          <span className="ml-1 text-xs font-semibold text-muted-foreground">{suffix}</span>
        ) : null}
      </p>
    </div>
  );
}

export function BreakdownSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(portalPanelNestedClass, "space-y-3 p-4", className)}>
      {title ? <p className={portalLabelClass}>{title}</p> : null}
      {children}
    </div>
  );
}

export function BreakdownSectionTitle({ children }: { children: ReactNode }) {
  return <p className={portalLabelClass}>{children}</p>;
}

export function BreakdownMetricRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className={cn("font-semibold tabular-nums text-foreground", valueClassName)}>{value}</span>
    </div>
  );
}

export function BreakdownProgressTrack({ value, className }: { value: number; className?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40 dark:bg-white/10">
      <div className={cn("h-full rounded-full transition-all duration-500", className)} style={{ width: `${value}%` }} />
    </div>
  );
}

export function BreakdownTableShell({ children }: { children: ReactNode }) {
  return (
    <div className={portalTableShellClass}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function BreakdownTable({ children }: { children: ReactNode }) {
  return (
    <table className="w-full max-w-full table-fixed border-collapse text-left text-xs text-foreground">
      {children}
    </table>
  );
}

export function BreakdownTableHead({ children }: { children: ReactNode }) {
  return <thead className={portalTableHeaderClass}>{children}</thead>;
}

export function BreakdownTableHeaderRow({ children }: { children: ReactNode }) {
  return (
    <tr className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </tr>
  );
}

export function BreakdownTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function BreakdownTableRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <tr className={cn(portalTableRowClass, className)}>{children}</tr>;
}

export function BreakdownTableCell({
  children,
  className,
  align = "left",
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <td className={cn("p-3 font-medium", align === "right" && "text-right", className)}>{children}</td>
  );
}

export function BreakdownTableHeaderCell({
  children,
  className,
  align = "left",
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <th className={cn("p-3", align === "right" && "text-right", className)}>{children}</th>
  );
}
