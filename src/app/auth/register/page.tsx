"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, AlertCircle, CheckCircle, KeyRound, ArrowRight } from "lucide-react";
import Link from "next/link";

interface SignUpData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  accessCode: string;
  agreeToTerms: boolean;
  agreeToDataPrivacyPolicy: boolean;
  agreeToMarketing: boolean;
}

function UnifiedAuthContent() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<SignUpData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    accessCode: "",
    agreeToTerms: false,
    agreeToDataPrivacyPolicy: false,
    agreeToMarketing: false,
  });

  const [isLoginView, setIsLoginView] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { register: registerUser, login, isLoading } = useAuth();

  useEffect(() => {
    const mode = searchParams.get("mode");
    const authError = searchParams.get("error");
    const email = searchParams.get("email");

    if (mode === "login" || mode === "signin" || authError) {
      setIsLoginView(true);
    }

    if (mode === "register" || mode === "signup") {
      setIsLoginView(false);
    }

    if (email) {
      setLoginData((prev) => ({ ...prev, email }));
      setFormData((prev) => ({ ...prev, email }));
    }

    if (authError) {
      setError("Please check your email and password, then try again.");
    }
  }, [searchParams]);

  const switchAuthMode = useCallback((nextIsLoginView: boolean) => {
    setIsLoginView(nextIsLoginView);
    setError("");
    setSuccess(false);
  }, []);

  const handleInputChange = useCallback(
    (field: keyof SignUpData, value: string | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setError(""); // Clear error when user starts typing
    },
    []
  );

  const handleLoginInputChange = useCallback(
    (field: keyof typeof loginData, value: string) => {
      setLoginData((prev) => ({ ...prev, [field]: value }));
      setError(""); // Clear error when user starts typing
    },
    []
  );

  const validateForm = (): string | null => {
    if (!formData.firstName.trim()) return "First name is required";
    if (!formData.lastName.trim()) return "Last name is required";
    if (!formData.email.trim()) return "Email is required";
    if (!formData.password) return "Password is required";
    if (formData.password.length < 8)
      return "Password must be at least 8 characters";
    if (formData.password !== formData.confirmPassword)
      return "Passwords do not match";
    if (!formData.accessCode.trim()) return "Access code is required";
    if (!formData.agreeToTerms)
      return "You must agree to the Terms & Conditions";
    if (!formData.agreeToDataPrivacyPolicy)
      return "You must agree to the Data Privacy Policy";

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email))
      return "Please enter a valid email address";

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      // The backend assigns the role from the access code.
      const registrationData = {
        username: formData.email, // Strapi uses username for login
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        // Include the checkbox fields that are in allowedFields
        agreeToTerms: formData.agreeToTerms,
        agreeToMarketing: formData.agreeToMarketing,
        agreeToDataPrivacyPolicy: formData.agreeToDataPrivacyPolicy,
        accessCode: formData.accessCode.trim(),
      };

      console.log("📝 Registration data being sent:", {
        ...registrationData,
        password: "[HIDDEN]",
        accessCode: "[HIDDEN]",
      });

      // Call registration via useAuth hook. Backend validates and attaches the access code.
      const result = await registerUser(registrationData);
      console.log("✅ Registration result:", result);

      // Success will be handled by the useAuth hook (redirect to login)
      // No need to set success state here since we'll be redirected
    } catch (err: any) {
      console.error("Registration error:", err);
      const message = String(err?.message || "");
      if (/email|username|already|taken/i.test(message)) {
        setError(
          "An account with this email already exists. Please sign in, then enter this access code from your candidate portal."
        );
        return;
      }

      setError(
        message ||
          "An error occurred during registration. Please try again."
      );
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!loginData.email || !loginData.password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      await login(loginData.email, loginData.password);
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    }
  };

  return (
    <div className="flex min-h-[100svh] w-full bg-black">
      
      {/* Left Pane - Branding & Narrative (Hidden on Mobile) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-white/10 bg-[#050505] p-12 lg:flex xl:p-16">
        {/* Background Visuals */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <AnimatedBackground />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/90" />
        </div>

        {/* Top Branding */}
        <div className="relative z-10">
          <Link href="/" className="inline-block transition-transform hover:scale-105">
            <BrandLogo layout="horizontal" className="h-10 w-auto" />
          </Link>
        </div>

        {/* Bottom Narrative */}
        <div className="relative z-10 max-w-lg">
          <blockquote className="space-y-6">
            <p className="text-3xl font-medium leading-tight tracking-tight text-white">
              "We stopped guessing based on interviews. Now we evaluate candidates under actual control room pressure."
            </p>
            <footer className="text-sm font-semibold text-cyan-400 uppercase tracking-widest flex items-center gap-3">
              <span className="h-px w-8 bg-cyan-400" />
              Mission Critical Assessment
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right Pane - Form Area */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-12 xl:px-24">
        <div className="mx-auto w-full max-w-[420px]">
          
          {/* Mobile Logo */}
          <div className="mb-10 flex justify-center lg:hidden">
            <Link href="/" className="inline-block">
              <BrandLogo layout="stacked" className="h-16 w-auto transition-transform hover:scale-105" />
            </Link>
          </div>

          {success ? (
            <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                <CheckCircle className="h-12 w-12" />
              </div>
              <h2 className="mb-3 text-3xl font-semibold tracking-tight text-white">
                Account Created
              </h2>
              <p className="mb-8 text-slate-400 leading-relaxed">
                Your account has been set up successfully. Please check your inbox for a confirmation email to verify your address.
              </p>
              <Button 
                onClick={() => switchAuthMode(true)} 
                className="h-12 w-full rounded-xl bg-white text-base font-medium text-black hover:bg-slate-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                Sign In Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Sleek Tab Toggle */}
              <div className="mb-8 flex items-center gap-6 border-b border-white/10 pb-4">
                <button
                  type="button"
                  onClick={() => switchAuthMode(true)}
                  className={cn(
                    "relative pb-2 text-lg font-medium transition-colors",
                    isLoginView ? "text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  Sign In
                  {isLoginView && (
                    <span className="absolute -bottom-[17px] left-0 right-0 h-[2px] rounded-t-full bg-cyan-400" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => switchAuthMode(false)}
                  className={cn(
                    "relative pb-2 text-lg font-medium transition-colors",
                    !isLoginView ? "text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  Create Account
                  {!isLoginView && (
                    <span className="absolute -bottom-[17px] left-0 right-0 h-[2px] rounded-t-full bg-cyan-400" />
                  )}
                </button>
              </div>

              {/* Header Text */}
              <div className="mb-8 space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  {isLoginView ? "Welcome back" : "Join the platform"}
                </h1>
                <p className="text-sm text-slate-400">
                  {isLoginView 
                    ? "Enter your credentials to securely access your workspace." 
                    : "Use your agency access code to configure your new account."}
                </p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-8 border-red-900/50 bg-red-950/20 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {isLoginView ? (
                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Email Address</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="john.smith@organization.com"
                      value={loginData.email}
                      onChange={(e) => handleLoginInputChange("email", e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-12 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-600 transition-all focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Password</Label>
                      <Link href="/auth/forgot-password" className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                        Forgot Password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => handleLoginInputChange("password", e.target.value)}
                        required
                        disabled={isLoading}
                        className="h-12 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-600 transition-all focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/50 pr-12"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 rounded-lg px-0 text-slate-400 hover:bg-white/5 hover:text-white"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="mt-6 h-12 w-full rounded-xl bg-white text-base font-medium text-black shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:bg-slate-200"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john.smith@organization.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-12 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-600 transition-all focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">First Name *</Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        required
                        disabled={isLoading}
                        className="h-12 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-600 transition-all focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Last Name *</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Smith"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        required
                        disabled={isLoading}
                        className="h-12 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-600 transition-all focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Password *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Min. 8 characters"
                          value={formData.password}
                          onChange={(e) => handleInputChange("password", e.target.value)}
                          required
                          disabled={isLoading}
                          className="h-12 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-600 transition-all focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/50 pr-12"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 rounded-lg px-0 text-slate-400 hover:bg-white/5 hover:text-white"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Confirm Password *</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm password"
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                          required
                          disabled={isLoading}
                          className="h-12 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-600 transition-all focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/50 pr-12"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 rounded-lg px-0 text-slate-400 hover:bg-white/5 hover:text-white"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          disabled={isLoading}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 rounded-2xl border border-white/5 bg-white/[0.01] p-5 shadow-inner">
                    <div className="space-y-3">
                      <Label htmlFor="accessCode" className="text-xs font-semibold uppercase tracking-wider text-cyan-400 block">Access Code *</Label>
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                        <Input
                          id="accessCode"
                          type="text"
                          placeholder="CTRL-9A2X"
                          value={formData.accessCode}
                          onChange={(e) => handleInputChange("accessCode", e.target.value)}
                          required
                          disabled={isLoading}
                          className="h-12 rounded-xl border-white/10 bg-[#050505] pl-12 text-lg font-medium uppercase tracking-[0.2em] text-white transition-all focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/50"
                        />
                      </div>
                      <p className="text-xs leading-relaxed text-slate-500 font-light">
                        Your code assigns you to the correct agency workspace.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onCheckedChange={(checked) => handleInputChange("agreeToTerms", !!checked)}
                        disabled={isLoading}
                        className="mt-1 border-slate-600 data-[state=checked]:border-cyan-500 data-[state=checked]:bg-cyan-500"
                      />
                      <Label htmlFor="agreeToTerms" className="cursor-pointer text-sm font-light leading-snug text-slate-400">
                        I agree to the <Link href="/terms-conditions" target="_blank" className="text-white hover:text-cyan-300 underline decoration-white/30 transition-colors">Terms & Conditions</Link> *
                      </Label>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="agreeToDataPrivacyPolicy"
                        checked={formData.agreeToDataPrivacyPolicy}
                        onCheckedChange={(checked) => handleInputChange("agreeToDataPrivacyPolicy", !!checked)}
                        disabled={isLoading}
                        className="mt-1 border-slate-600 data-[state=checked]:border-cyan-500 data-[state=checked]:bg-cyan-500"
                      />
                      <Label htmlFor="agreeToDataPrivacyPolicy" className="cursor-pointer text-sm font-light leading-snug text-slate-400">
                        I agree to the <Link href="/privacy-policy" target="_blank" className="text-white hover:text-cyan-300 underline decoration-white/30 transition-colors">Data Privacy Policy</Link> *
                      </Label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="mt-6 h-12 w-full rounded-xl bg-white text-base font-medium text-black shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:bg-slate-200"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}

export default function UnifiedAuthPage() {
  return (
    <Suspense fallback={<div className="min-h-[100svh] bg-black" />}>
      <UnifiedAuthContent />
    </Suspense>
  );
}
