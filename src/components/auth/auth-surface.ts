import { cn } from "@/lib/utils";

/** Shared semantic field chrome for login / join / recovery forms. */
export const authInputClassName =
  "h-12 rounded-xl border-border bg-background text-foreground placeholder:text-muted-foreground shadow-sm transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring";

export const authInputInvalidClassName =
  "border-destructive/80 bg-destructive/5 focus-visible:border-destructive focus-visible:ring-destructive/30";

export const authLabelClassName = "text-sm font-medium text-foreground";

export const authMutedTextClassName = "text-sm text-muted-foreground";

export const authLinkClassName =
  "font-medium text-primary underline-offset-4 hover:underline";

export function authFieldClassName(invalid?: boolean, extra?: string) {
  return cn(authInputClassName, invalid && authInputInvalidClassName, extra);
}
