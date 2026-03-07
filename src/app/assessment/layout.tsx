import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Siren, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AuthProvider } from "@/components/auth/auth-provider";

export default function AssessmentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-4 flex-1 justify-center">
            <Link
              href="/"
              className="hover:scale-110 transition-transform duration-200 absolute left-4"
            >
              <Siren className="h-6 w-6 text-primary cursor-pointer" />
            </Link>
            <h2 className="text-xl font-semibold font-headline text-center">
              Assessment In Progress
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              asChild
            >
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Dashboard
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
