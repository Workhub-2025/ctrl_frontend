/**
 * Props for the DashboardPageHeader component.
 */
interface DashboardPageHeaderProps {
  title: string;
  description: string;
}

/**
 * DashboardPageHeader Component
 * 
 * Provides a consistent, standardized title and description header for 
 * pages within the dashboard layouts.
 * 
 * @param {DashboardPageHeaderProps} props - The title and description strings.
 */
export function DashboardPageHeader({ title, description }: DashboardPageHeaderProps) {
  return (
    <div className="space-y-2 mb-8">
      <h1 className="text-3xl font-bold font-headline text-foreground">{title}</h1>
      <p className="text-muted-foreground text-lg">{description}</p>
    </div>
  );
}