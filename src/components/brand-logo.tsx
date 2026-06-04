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
        // mix-blend-screen automatically makes black backgrounds fully transparent!
        // 1. We use `scale-125` to zoom the image slightly to trim the built-in padding.
        // 2. If it still looks off-center, change `translate-x-0` or `translate-y-0` to nudge it! 
        //    (e.g., `-translate-x-1` moves it left, `translate-y-2` moves it down)
        className="h-full w-full object-contain object-center mix-blend-screen scale-125 -translate-x-1 translate-y-0.5 pointer-events-none"
      />
    </div>
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
        className={cn("object-contain mix-blend-screen", layout === "stacked" ? "h-10" : "h-7")}
      />
    </div>
  );
}
