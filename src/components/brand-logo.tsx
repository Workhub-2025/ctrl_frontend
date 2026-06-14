"use client";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  title?: string;
  layout?: "horizontal" | "stacked";
};

type BrandMarkProps = {
  className?: string;
  title?: string;
};

export function BrandMark({
  className,
  title = "CTRL mark",
}: BrandMarkProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <img
        src="/assets/newlogo.png"
        alt={title}
        // Use mix-blend-multiply + invert in light mode, and mix-blend-screen + dark:invert-0 in dark mode
        // to handle the black background of the logo asset cleanly across all themes.
        className="h-full w-full object-contain object-center mix-blend-multiply invert dark:mix-blend-screen dark:invert-0 scale-125 -translate-x-1 translate-y-0.5 pointer-events-none hue-rotate-[60deg]"
      />
    </div>
  );
}

export function CtrlText({ className }: { className?: string }) {
  return (
    <img
      src="https://see.fontimg.com/api/rf5/9MqPB/YWZmYmE0ZjMwZGU1NDI0OTg1NTFiYWM2YzcwNzM4NzUub3Rm/Q1RSTA/tabel-sans.png?r=fs&h=89&w=1000&fg=FFFFFF&bg=000000&tb=1&s=89"
      alt="CTRL"
      // Use mix-blend-multiply + invert in light mode, and mix-blend-screen + dark:invert-0 in dark mode
      // to render the white-on-black image asset with high contrast on both light and dark themes.
      className={cn("inline-block object-contain mix-blend-multiply invert dark:mix-blend-screen dark:invert-0 h-[1em] translate-y-[-0.05em]", className)}
    />
  );
}

export function BrandLogo({
  className,
  title = "CTRL",
  layout = "horizontal",
}: BrandLogoProps) {
  return (
    <div 
      className={cn(
        "flex items-center select-none", 
        layout === "stacked" ? "flex-col gap-4" : "flex-row gap-4",
        className
      )} 
      aria-label={title}
    >
      <BrandMark className={layout === "stacked" ? "h-20 w-20" : "h-12 w-12"} />
      <img
        src="https://see.fontimg.com/api/rf5/9MqPB/YWZmYmE0ZjMwZGU1NDI0OTg1NTFiYWM2YzcwNzM4NzUub3Rm/Q1RSTA/tabel-sans.png?r=fs&h=89&w=1000&fg=FFFFFF&bg=000000&tb=1&s=89"
        alt="CTRL Text"
        // Use mix-blend-multiply + invert in light mode, and mix-blend-screen + dark:invert-0 in dark mode
        className={cn("object-contain mix-blend-multiply invert dark:mix-blend-screen dark:invert-0", layout === "stacked" ? "h-10" : "h-7")}
      />
    </div>
  );
}
