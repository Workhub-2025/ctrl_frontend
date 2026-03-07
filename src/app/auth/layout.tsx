import { Siren } from "lucide-react";
import Link from "next/link";
import { PublicAuthProvider } from "@/components/auth/public-auth-provider";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PublicAuthProvider>
      <div className="min-h-screen bg-background">
        {/* Simple Header without logo - logo is shown in each page */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-2">
            {/* Minimal header - each auth page shows its own logo */}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center p-4">
          <div className="w-full max-w-md">{children}</div>
        </main>

        {/* Simple Footer */}
        <footer className="border-t bg-background py-6 px-4">
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
