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
    <Card className="flex flex-col rounded-3xl border-white/10 bg-white/[0.035] shadow-[0_24px_80px_rgba(2,6,23,0.28)] transition-transform duration-300 ease-in-out hover:-translate-y-1 hover:bg-white/[0.055]">
      <CardHeader className="flex flex-row items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          {icon}
        </div>
        <div>
          <CardTitle className="font-headline text-lg leading-snug">
            {title}
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed text-muted-foreground/90">
            Skills Assessment
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-base leading-relaxed text-muted-foreground/90">{description}</p>
      </CardContent>
      <CardFooter>
        <Button asChild className="h-11 w-full rounded-xl">
          <Link href={href}>
            Start Assessment <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
