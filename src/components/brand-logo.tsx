import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  title?: string;
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
    <span className={cn("inline-flex w-12 shrink-0", className)}>
      <Image
        src="/assets/ctrl-logo-mark-official.png"
        alt={title}
        width={520}
        height={520}
        className="h-auto w-full"
        priority={false}
      />
    </span>
  );
}

export function BrandLogo({
  className,
  title = "CTRL",
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex w-[170px] shrink-0", className)}>
      <Image
        src="/assets/ctrl-logo-official.png"
        alt={title}
        width={1192}
        height={530}
        className="h-auto w-full"
        priority={false}
      />
    </span>
  );
}
