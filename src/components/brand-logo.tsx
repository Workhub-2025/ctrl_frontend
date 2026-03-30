import { cn } from "@/lib/utils";
import { useId } from "react";

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
  const baseId = useId().replace(/:/g, "");
  const ringId = `${baseId}-ring`;
  const stemId = `${baseId}-stem`;

  return (
    <svg
      viewBox="0 0 260 250"
      role="img"
      aria-label={title}
      className={cn("h-auto w-12", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={ringId} x1="84" y1="21" x2="157" y2="174">
          <stop offset="0%" stopColor="#27b9df" />
          <stop offset="48%" stopColor="#0f6f8b" />
          <stop offset="100%" stopColor="#090c12" />
        </linearGradient>
        <linearGradient id={stemId} x1="131" y1="3" x2="131" y2="110">
          <stop offset="0%" stopColor="#27b9df" />
          <stop offset="55%" stopColor="#0d5c76" />
          <stop offset="100%" stopColor="#081018" />
        </linearGradient>
      </defs>

      <title>{title}</title>

      <g transform="translate(18 10)">
        <path
          d="M105 16C57 31 23 75 23 127c0 62 49 112 109 112 40 0 76-18 99-51l-34-22c-15 22-38 35-65 35-42 0-76-34-76-76 0-29 16-54 40-67V16Z"
          fill={`url(#${ringId})`}
        />
        <path
          d="M160 28 203 50 174 79 137 48Z"
          fill="currentColor"
          opacity="0.75"
        />
        <rect
          x="111"
          y="0"
          width="40"
          height="104"
          rx="20"
          fill={`url(#${stemId})`}
        />
      </g>
    </svg>
  );
}

export function BrandLogo({
  className,
  title = "CTRL",
}: BrandLogoProps) {
  const baseId = useId().replace(/:/g, "");
  const ringId = `${baseId}-ring`;
  const stemId = `${baseId}-stem`;
  const shadowId = `${baseId}-shadow`;

  return (
    <svg
      viewBox="0 0 640 190"
      role="img"
      aria-label={title}
      className={cn("h-auto w-[170px]", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={ringId} x1="65" y1="12" x2="136" y2="156">
          <stop offset="0%" stopColor="#27b9df" />
          <stop offset="48%" stopColor="#0f6f8b" />
          <stop offset="100%" stopColor="#090c12" />
        </linearGradient>
        <linearGradient id={stemId} x1="121" y1="0" x2="121" y2="101">
          <stop offset="0%" stopColor="#27b9df" />
          <stop offset="55%" stopColor="#0d5c76" />
          <stop offset="100%" stopColor="#081018" />
        </linearGradient>
        <linearGradient id={shadowId} x1="258" y1="34" x2="417" y2="166">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.92" />
          <stop offset="100%" stopColor="currentColor" />
        </linearGradient>
      </defs>

      <title>{title}</title>

      <g transform="translate(22 16)">
        <path
          d="M105 16C57 31 23 75 23 127c0 62 49 112 109 112 40 0 76-18 99-51l-34-22c-15 22-38 35-65 35-42 0-76-34-76-76 0-29 16-54 40-67V16Z"
          fill={`url(#${ringId})`}
        />
        <path
          d="M160 28 203 50 174 79 137 48Z"
          fill="currentColor"
          opacity="0.42"
        />
        <rect
          x="111"
          y="0"
          width="40"
          height="104"
          rx="20"
          fill={`url(#${stemId})`}
        />
      </g>

      <g transform="translate(245 132) skewX(-14)">
        <text
          x="0"
          y="0"
          fill={`url(#${shadowId})`}
          fontFamily="Arial Black, Helvetica, sans-serif"
          fontSize="126"
          fontWeight="900"
          letterSpacing="-8"
        >
          TRL
        </text>
      </g>
    </svg>
  );
}
