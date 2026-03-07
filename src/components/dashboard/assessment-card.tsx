import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type AssessmentCardProps = Readonly<{
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}>;

export function AssessmentCard({
  icon,
  title,
  description,
  href,
}: AssessmentCardProps) {
  return (
    <Card className="flex flex-col transition-transform duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl">
      <CardHeader className="flex flex-row items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20 text-accent">
          {icon}
        </div>
        <div>
          <CardTitle
            className="font-headline text-lg leading-snug"
          >
            {title}
          </CardTitle>
          <CardDescription
            className="text-sm text-muted-foreground leading-relaxed"
          >
            Skills Assessment
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p
          className="text-muted-foreground text-base leading-relaxed"
        >
          {description}
        </p>
      </CardContent>
      <CardFooter>
        <Button
          asChild
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full"
        >
          <Link href={href}>
            Start Assessment <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
