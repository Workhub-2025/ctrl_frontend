"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { BrandLogo } from "@/components/brand-logo";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import Link from "next/link";

const DEV_SEEDED_PASSWORD = "CtrlDemo123!";
const DEV_SEEDED_ACCOUNTS = [
  {
    label: "Candidate",
    email: "candidate.demo@ctrl.local",
  },
  {
    label: "Hiring Manager",
    email: "recruiter.demo@ctrl.local",
  },
  {
    label: "Client",
    email: "client.demo@ctrl.local",
  },
  {
    label: "Admin",
    email: "admin.demo@ctrl.local",
  },
];

// Component that uses useSearchParams
function SignInContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { login, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const showDevAccounts =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_SHOW_DEV_ACCOUNTS === "true";

  // Check for success message from URL parameters
  useEffect(() => {
    const message = searchParams.get("message");
    const authError = searchParams.get("error");

    if (message) {
      setSuccessMessage(message);
    }

    if (authError) {
      if (authError === "LOCKED_OUT") {
        setError("Too many failed attempts. Please wait before trying again.");
      } else if (authError === "AUTH_SERVICE_UNAVAILABLE" || authError === "Configuration") {
        setError("Authentication service is currently unavailable. Please try again shortly.");
      } else if (authError === "AccessDenied") {
        setError("Access denied for this account.");
      } else if (authError !== "CredentialsSignin") {
        setError("Unable to sign in right now. Please try again.");
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage(""); // Clear any success message when attempting login

    try {
      await login(email, password);
      // The useAuth hook will handle navigation to dashboard
    } catch (error: any) {
      setError(
        error.message || "An error occurred during sign in. Please try again."
      );
    }
  };

  return (
    <div className="auth-page">
      <Card className="auth-card border-border/70 bg-card/88 shadow-[0_26px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:shadow-[0_28px_90px_rgba(2,6,23,0.44)]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center auth-logo">
            <Link href="/" className="block">
              <BrandLogo className="w-[176px] text-foreground transition-transform hover:scale-[1.02]" />
            </Link>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Welcome Back</CardTitle>
          <CardDescription className="text-base leading-7 text-muted-foreground">
            Sign in to your CTRL account to continue your assessment journey
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {successMessage && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {showDevAccounts && (
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                <div className="mb-2">
                  <p className="text-sm font-semibold">Dev seeded accounts</p>
                  <p className="text-xs text-muted-foreground">
                    Local-only test logins. Password for all accounts:{" "}
                    <span className="font-medium text-foreground">
                      {DEV_SEEDED_PASSWORD}
                    </span>
                  </p>
                </div>
                <div className="space-y-2">
                  {DEV_SEEDED_ACCOUNTS.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => {
                        setEmail(account.email);
                        setPassword(DEV_SEEDED_PASSWORD);
                        setError("");
                      }}
                      className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-left transition-colors hover:bg-background"
                    >
                      <span>
                        <span className="block text-sm font-medium">
                          {account.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {account.email}
                        </span>
                      </span>
                      <span className="text-xs font-medium text-primary">
                        Use
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@organization.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-11 border-border/70 bg-background/70 focus-visible:ring-primary/35"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 border-border/70 bg-background/70 pr-10 focus-visible:ring-primary/35"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember"
                  className="rounded border-border bg-background text-primary"
                />
                <Label htmlFor="remember" className="text-sm">
                  Remember me
                </Label>
              </div>
              <Link
                href="/auth/forgot-password"
                className="text-sm font-medium text-primary hover:text-primary/80 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="h-11 w-full rounded-xl border border-primary/10 bg-primary text-primary-foreground shadow-[0_18px_38px_hsl(var(--primary)/0.28)] transition-all duration-200 hover:bg-primary/90 hover:shadow-[0_22px_46px_hsl(var(--primary)/0.32)]"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Don't have an account?
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="h-11 w-full rounded-xl border-border/70 bg-background/40 hover:bg-muted/70"
              asChild
            >
              <Link href="/auth/register">Create Account</Link>
            </Button>

            <p
              className="text-center text-xs text-muted-foreground leading-relaxed"
            >
              By signing in, you agree to our{" "}
              <Link
                href="/terms-conditions"
                target="_blank"
                className="underline"
              >
                Terms & Conditions
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy-policy"
                target="_blank"
                className="underline"
              >
                Data Privacy Policy
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

// Loading fallback component
function SignInLoading() {
  return (
    <div className="auth-page">
      <Card className="auth-card border-border/70 bg-card/88 shadow-[0_26px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:shadow-[0_28px_90px_rgba(2,6,23,0.44)]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center auth-logo">
            <Link href="/" className="block">
              <BrandLogo className="w-[176px] text-foreground transition-transform hover:scale-[1.02]" />
            </Link>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Loading sign in form...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-muted"></div>
              <div className="h-11 rounded bg-muted"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-20 rounded bg-muted"></div>
              <div className="h-11 rounded bg-muted"></div>
            </div>
            <div className="h-11 rounded bg-muted"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInContent />
    </Suspense>
  );
}
