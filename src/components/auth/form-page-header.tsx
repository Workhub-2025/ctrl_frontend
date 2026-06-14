import { CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

type ColorVariant = "blue" | "green" | "amber";

const colorVariants: Record<ColorVariant, string> = {
  blue: "bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
  green: "bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400",
  amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
};

interface FormPageHeaderProps {
  icon: LucideIcon;
  title: React.ReactNode;
  description: React.ReactNode;
  color?: ColorVariant;
}

/**
 * FormPageHeader Component
 * 
 * A standardized header for forms and informational pages, featuring a prominent 
 * colored icon, a main title, and a description.
 * 
 * @param {FormPageHeaderProps} props - The component props.
 */
export function FormPageHeader({ icon: Icon, title, description, color = "blue" }: FormPageHeaderProps) {
  return (
    <div className="text-center">
      <div className={cn("mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full", colorVariants[color])}>
        <Icon className="h-8 w-8" />
      </div>
      <CardTitle className="text-2xl font-headline">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </div>
  );
}