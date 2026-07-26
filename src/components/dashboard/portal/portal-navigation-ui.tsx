import Link from "next/link";
import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
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
