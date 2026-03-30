import { PublicAuthProvider } from "@/components/auth/public-auth-provider";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PublicAuthProvider>
      <div className="relative min-h-screen overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_34%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.12),transparent_32%)] dark:bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_bottom,rgba(12,74,110,0.18),transparent_34%)]" />
        <header className="relative z-10 border-b border-border/60 bg-background/72 backdrop-blur-xl supports-[backdrop-filter]:bg-background/52">
          <div className="container mx-auto flex items-center justify-end px-4 py-3">
            <ThemeToggle />
          </div>
        </header>

        <main className="relative z-10 flex min-h-[calc(100vh-8.5rem)] items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
          <div className="w-full max-w-md">{children}</div>
        </main>

        <footer className="relative z-10 border-t border-border/60 bg-background/68 px-4 py-6 backdrop-blur supports-[backdrop-filter]:bg-background/52">
          <div className="container mx-auto text-center text-sm text-muted-foreground">
            <p>
              &copy; {new Date().getFullYear()} CTRL Assessment Platform. All
              rights reserved.
            </p>
            <p className="mt-1">
              A commitment to public safety through intelligent recruitment.
            </p>
          </div>
        </footer>
      </div>
    </PublicAuthProvider>
  );
}
