import { CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

type ColorVariant = "blue" | "green" | "amber";

const colorVariants: Record<ColorVariant, string> = {
  blue: "bg-info/15 text-info",
  green: "bg-success/15 text-success",
  amber: "bg-warning/15 text-warning",
};

interface FormPageHeaderProps {
  icon: LucideIcon;
  title: React.ReactNode;
  description: React.ReactNode;
  color?: ColorVariant;
}

export function FormPageHeader({
  icon: Icon,
  title,
  description,
  color = "blue",
}: FormPageHeaderProps) {
  return (
    <div className="text-center">
      <div
        className={cn(
          "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full",
          colorVariants[color],
        )}
      >
        <Icon className="h-8 w-8" />
      </div>
      <CardTitle className="font-headline text-2xl">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </div>
  );
}
