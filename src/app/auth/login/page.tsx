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

    // next-auth v4 + Next.js 15 can inject ?error=undefined in the callback URL on
    // successful login; skip it to avoid showing a spurious error message.
    if (authError && authError !== "undefined") {
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
      <Card className="shadow-2xl auth-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center auth-logo">
            <Link href="/" className="block">
              <div className="flex flex-col items-center gap-1 p-2">
                <img
                  src="/icon1.png"
                  className="h-15 w-15 logo-adaptive cursor-pointer transition-transform hover:scale-105 logo-adaptive-filter"
                  alt="CTRL Logo"
                  loading="eager"
                />
              </div>
            </Link>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
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
                className="h-11"
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
                  className="h-11 pr-10"
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
                  className="rounded border-gray-300"
                />
                <Label htmlFor="remember" className="text-sm">
                  Remember me
                </Label>
              </div>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full h-11 bg-slate-800 hover:bg-slate-200 dark:bg-blue-400 dark:hover:bg-slate-800 text-white hover:text-slate-800 dark:hover:text-white transition-all duration-200 border-0 shadow-md hover:shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Don't have an account?
                </span>
              </div>
            </div>

            <Button variant="outline" className="w-full h-11" asChild>
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
      <Card className="shadow-2xl auth-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center auth-logo">
            <Link href="/" className="block">
              <div className="flex flex-col items-center gap-1 p-2">
                <img
                  src="/icon1.png"
                  className="h-15 w-15 logo-adaptive cursor-pointer transition-transform hover:scale-105 logo-adaptive-filter"
                  alt="CTRL Logo"
                  loading="eager"
                />
              </div>
            </Link>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Loading sign in form...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-11 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-11 bg-gray-200 rounded"></div>
            </div>
            <div className="h-11 bg-gray-200 rounded"></div>
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
