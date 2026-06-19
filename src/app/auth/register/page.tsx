"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { AnimatedSubmitButton, ButtonState } from "@/components/ui/animated-submit-button";
import { AuthBrandingPane } from "@/components/auth/auth-branding-pane";
import { AuthLoginForm } from "@/components/auth/auth-login-form";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, CheckCircle, KeyRound, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { AccessibilityDropdown } from "@/components/accessibility/accessibility-dropdown";

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

type AuthField =
  | "loginEmail"
  | "loginPassword"
  | "firstName"
  | "lastName"
  | "email"
  | "password"
  | "confirmPassword"
  | "accessCode"
  | "terms"
  | "privacy";

function UnifiedAuthContent() {
  const searchParams = useSearchParams();
  const {
    settings: accessibilitySettings,
    updateSettings: updateAccessibilitySettings,
    resetSettings: resetAccessibilitySettings,
    themeClassName: bgColor,
  } = useAccessibilitySettings();
  const submitPanelVariant =
    accessibilitySettings.theme === "soft-cream" || accessibilitySettings.theme === "light-blue"
      ? "light-panel"
      : "dark-panel";
  const isLightAuthTheme = submitPanelVariant === "light-panel";
  
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
  const [initialLoginEmail, setInitialLoginEmail] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [authAction, setAuthAction] = useState<"login" | "register" | null>(null);
  const [submitStatus, setSubmitStatus] = useState<ButtonState>("idle");
  const [invalidFields, setInvalidFields] = useState<AuthField[]>([]);
  const invalidResetTimer = useRef<number | null>(null);
  const { register: registerUser, login } = useAuth();
  // Only disable while a login/register submit is in flight — not during background session bootstrap.
  const isAuthBusy = authAction !== null;

  useEffect(() => {
    return () => {
      if (invalidResetTimer.current) {
        window.clearTimeout(invalidResetTimer.current);
      }
    };
  }, []);

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
      setInitialLoginEmail(email);
      setFormData((prev) => ({ ...prev, email }));
    }

    const accessCode = searchParams.get("code");
    if (accessCode) {
      setIsLoginView(false);
      setFormData((prev) => ({ ...prev, accessCode }));
    }

    if (authError) {
      setError("Credentials not verified.");
    }
  }, [searchParams]);

  const switchAuthMode = useCallback((nextIsLoginView: boolean) => {
    if (authAction) return;

    setIsLoginView(nextIsLoginView);
    setError("");
    setInvalidFields([]);
    setSuccess(false);
    setSubmitStatus("idle");
  }, [authAction]);

  const showFieldErrors = useCallback((fields: AuthField[]) => {
    if (invalidResetTimer.current) {
      window.clearTimeout(invalidResetTimer.current);
    }

    setError("");
    setInvalidFields([]);
    setSubmitStatus("idle");
    window.setTimeout(() => {
      setInvalidFields(fields);
      setSubmitStatus("invalid");
      invalidResetTimer.current = window.setTimeout(() => {
        setInvalidFields([]);
      }, 1800);
    }, 0);
  }, []);

  const hasInvalidField = useCallback(
    (field: AuthField) => invalidFields.includes(field),
    [invalidFields]
  );

  const inputClassName = useCallback(
    (field: AuthField, extra?: string) => cn(
      isLightAuthTheme
        ? "h-12 rounded-xl border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 shadow-sm transition-[border-color,box-shadow] focus-visible:border-sky-500/60 focus-visible:ring-1 focus-visible:ring-sky-500/30"
        : "h-12 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-600 transition-[border-color,box-shadow] focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/50",
      hasInvalidField(field) &&
        (isLightAuthTheme
          ? "border-red-500/80 bg-red-50 focus-visible:border-red-500/80 focus-visible:ring-red-500/30"
          : "border-red-500/80 bg-red-950/15 focus-visible:border-red-400/80 focus-visible:ring-red-400/40"),
      extra
    ),
    [hasInvalidField, isLightAuthTheme]
  );

  const handleInputChange = useCallback(
    (field: keyof SignUpData, value: string | boolean) => {
      if (invalidResetTimer.current) {
        window.clearTimeout(invalidResetTimer.current);
      }

      setFormData((prev) => ({ ...prev, [field]: value }));
      setError(""); // Clear error when user starts typing
      setInvalidFields([]);
      setSubmitStatus("idle");
    },
    []
  );

  const handleLogin = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      setAuthAction("login");
      try {
        await login(email, password);
      } catch (err) {
        throw err;
      } finally {
        setAuthAction(null);
      }
    },
    [login]
  );

  const validateForm = (): AuthField[] => {
    const fields: AuthField[] = [];

    if (!formData.firstName.trim()) fields.push("firstName");
    if (!formData.lastName.trim()) fields.push("lastName");
    if (!formData.email.trim()) fields.push("email");
    if (!formData.password || formData.password.length < 8) fields.push("password");
    if (!formData.confirmPassword || formData.password !== formData.confirmPassword) {
      fields.push("confirmPassword");
    }
    if (!formData.accessCode.trim()) fields.push("accessCode");
    if (!formData.agreeToTerms)
      fields.push("terms");
    if (!formData.agreeToDataPrivacyPolicy)
      fields.push("privacy");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email.trim() && !emailRegex.test(formData.email)) {
      fields.push("email");
    }

    return Array.from(new Set(fields));
  };

  const isFormSubmittable = validateForm().length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authAction) return;

    setError("");
    setInvalidFields([]);

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      showFieldErrors(validationErrors);
      return;
    }

    try {
      setAuthAction("register");
      setSubmitStatus("loading");
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

      // Call registration via useAuth hook. Backend validates and attaches the access code.
      await registerUser(registrationData);
      setSubmitStatus("success");
      // Success will be handled by the useAuth hook (redirect to login)
      // No need to set success state here since we'll be redirected
    } catch (err: any) {
      console.error("Registration error:", err);
      const message = String(err?.message || "");
      if (/email|username|already|taken/i.test(message)) {
        setError("An account with this email already exists.");
        setAuthAction(null);
        setSubmitStatus("error");
        return;
      }

      if (/access|code|credential|invalid|expired|not found|not verified/i.test(message)) {
        setError("Credentials not verified.");
      } else {
        setError("Account creation failed.");
      }
      setAuthAction(null);
      setSubmitStatus("error");
    }
  };

  return (
    <div className={cn("relative flex min-h-[100svh] w-full ctrl-landing-page", bgColor)}>
      <AuthBrandingPane isLightTheme={isLightAuthTheme} />
      <div className="relative flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-12 xl:px-24">
        {/* Accessibility Dropdown at Top Right */}
        <div className="absolute top-6 right-6 lg:top-8 lg:right-8 z-50">
          <AccessibilityDropdown
            settings={accessibilitySettings}
            updateSettings={updateAccessibilitySettings}
            resetSettings={resetAccessibilitySettings}
          />
        </div>

        <div className="mx-auto w-full max-w-[420px]">
          
          {/* Mobile Logo */}
          <div className="mb-10 flex justify-center lg:hidden">
            <Link href="/" className="inline-block">
              <BrandLogo layout="stacked" className="h-16 w-[7.125rem] transition-transform hover:scale-105" />
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
                className="h-12 w-full rounded-xl bg-white text-base font-medium text-black hover:bg-slate-200 hover:shadow-sm transition-colors shadow-none"
              >
                Sign In Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-500" aria-busy={isAuthBusy}>
              {/* Segmented toggle */}
              <div
                role="tablist"
                aria-label="Authentication mode"
                className={cn(
                  "mb-8 grid grid-cols-2 gap-1 rounded-full border p-1",
                  isLightAuthTheme
                    ? "border-slate-200 bg-white/80 shadow-sm"
                    : "border-white/10 bg-white/[0.03]"
                )}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={isLoginView}
                  onClick={() => switchAuthMode(true)}
                  disabled={isAuthBusy}
                  className={cn(
                    "rounded-full py-2.5 text-sm font-medium transition-all duration-300",
                    isLoginView
                      ? isLightAuthTheme
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-white text-black shadow-sm"
                      : isLightAuthTheme
                        ? "text-slate-600 hover:text-slate-950"
                        : "text-slate-400 hover:text-white",
                    isAuthBusy && "cursor-not-allowed opacity-60"
                  )}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={!isLoginView}
                  onClick={() => switchAuthMode(false)}
                  disabled={isAuthBusy}
                  className={cn(
                    "rounded-full py-2.5 text-sm font-medium transition-all duration-300",
                    !isLoginView
                      ? isLightAuthTheme
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-white text-black shadow-sm"
                      : isLightAuthTheme
                        ? "text-slate-600 hover:text-slate-950"
                        : "text-slate-400 hover:text-white",
                    isAuthBusy && "cursor-not-allowed opacity-60"
                  )}
                >
                  Create Account
                </button>
              </div>

              {/* Header Text */}
              <div className="mb-8 space-y-2">
                <h1 className={cn("text-3xl font-semibold tracking-tight", isLightAuthTheme ? "text-slate-950" : "text-white")}>
                  {isLoginView ? "Welcome back" : "Join the platform"}
                </h1>
                <p className={cn("text-sm", isLightAuthTheme ? "text-slate-600" : "text-slate-400")}>
                  {isLoginView
                    ? "Enter your credentials to securely access your workspace."
                    : "Use your agency access code to configure your new account."}
                </p>
              </div>

              {isLoginView ? (
                <AuthLoginForm
                  initialEmail={initialLoginEmail}
                  disabled={isAuthBusy}
                  panelVariant={submitPanelVariant}
                  inputVariant={isLightAuthTheme ? "light" : "dark"}
                  onSubmit={handleLogin}
                />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="email" className={cn("block text-xs font-semibold uppercase tracking-wider", isLightAuthTheme ? "text-slate-600" : "text-slate-400")}>Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john.smith@organization.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                      disabled={isAuthBusy}
                      className={inputClassName("email")}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className={cn("block text-xs font-semibold uppercase tracking-wider", isLightAuthTheme ? "text-slate-600" : "text-slate-400")}>First Name *</Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        required
                        disabled={isAuthBusy}
                        className={inputClassName("firstName")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className={cn("block text-xs font-semibold uppercase tracking-wider", isLightAuthTheme ? "text-slate-600" : "text-slate-400")}>Last Name *</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Smith"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        required
                        disabled={isAuthBusy}
                        className={inputClassName("lastName")}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password" className={cn("block text-xs font-semibold uppercase tracking-wider", isLightAuthTheme ? "text-slate-600" : "text-slate-400")}>Password *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Min. 8 characters"
                          value={formData.password}
                          onChange={(e) => handleInputChange("password", e.target.value)}
                          required
                          disabled={isAuthBusy}
                          className={inputClassName("password", "pr-12")}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 rounded-lg px-0",
                            isLightAuthTheme
                              ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              : "text-slate-400 hover:bg-white/5 hover:text-white"
                          )}
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isAuthBusy}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className={cn("block text-xs font-semibold uppercase tracking-wider", isLightAuthTheme ? "text-slate-600" : "text-slate-400")}>Confirm Password *</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm password"
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                          required
                          disabled={isAuthBusy}
                          className={inputClassName("confirmPassword", "pr-12")}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 rounded-lg px-0",
                            isLightAuthTheme
                              ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              : "text-slate-400 hover:bg-white/5 hover:text-white"
                          )}
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          disabled={isAuthBusy}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className={cn(
                    "mt-2 rounded-2xl border p-5",
                    isLightAuthTheme
                      ? "border-slate-200 bg-white/70 shadow-sm"
                      : "border-white/5 bg-white/[0.01] shadow-inner"
                  )}>
                    <div className="space-y-3">
                      <Label htmlFor="accessCode" className={cn("block text-xs font-semibold uppercase tracking-wider", isLightAuthTheme ? "text-sky-700" : "text-cyan-400")}>Access Code *</Label>
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                        <Input
                          id="accessCode"
                          type="text"
                          placeholder="CTRL-9A2X"
                          value={formData.accessCode}
                          onChange={(e) => handleInputChange("accessCode", e.target.value)}
                          required
                          disabled={isAuthBusy}
                          className={inputClassName(
                            "accessCode",
                            cn(
                              "pl-12 text-lg font-medium uppercase tracking-[0.2em]",
                              !isLightAuthTheme && "bg-[#050505]"
                            )
                          )}
                        />
                      </div>
                      <p className={cn("text-xs leading-relaxed font-light", isLightAuthTheme ? "text-slate-600" : "text-slate-500")}>
                        Your code assigns you to the correct agency workspace.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className={cn(
                      "flex items-center space-x-3 rounded-lg border border-transparent p-1 transition-colors",
                      hasInvalidField("terms") &&
                        (isLightAuthTheme ? "border-red-500/40 bg-red-50" : "border-red-500/40 bg-red-950/10")
                    )}>
                      <Checkbox
                        id="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onCheckedChange={(checked) => handleInputChange("agreeToTerms", !!checked)}
                        disabled={isAuthBusy}
                        className={cn(
                          isLightAuthTheme
                            ? "border-slate-400 data-[state=checked]:border-sky-700 data-[state=checked]:bg-sky-700"
                            : "border-slate-600 data-[state=checked]:border-cyan-500 data-[state=checked]:bg-cyan-500",
                          hasInvalidField("terms") && "border-red-500"
                        )}
                      />
                      <Label htmlFor="agreeToTerms" className="cursor-pointer text-sm font-light leading-snug text-slate-400">
                        <span className={isLightAuthTheme ? "text-slate-700" : undefined}>
                          I agree to the <Link href="/terms-conditions" target="_blank" className={cn("underline transition-colors", isLightAuthTheme ? "text-slate-950 decoration-slate-400 hover:text-sky-800" : "text-white decoration-white/30 hover:text-cyan-300")}>Terms & Conditions</Link> *
                        </span>
                      </Label>
                    </div>
                    <div className={cn(
                      "flex items-center space-x-3 rounded-lg border border-transparent p-1 transition-colors",
                      hasInvalidField("privacy") &&
                        (isLightAuthTheme ? "border-red-500/40 bg-red-50" : "border-red-500/40 bg-red-950/10")
                    )}>
                      <Checkbox
                        id="agreeToDataPrivacyPolicy"
                        checked={formData.agreeToDataPrivacyPolicy}
                        onCheckedChange={(checked) => handleInputChange("agreeToDataPrivacyPolicy", !!checked)}
                        disabled={isAuthBusy}
                        className={cn(
                          isLightAuthTheme
                            ? "border-slate-400 data-[state=checked]:border-sky-700 data-[state=checked]:bg-sky-700"
                            : "border-slate-600 data-[state=checked]:border-cyan-500 data-[state=checked]:bg-cyan-500",
                          hasInvalidField("privacy") && "border-red-500"
                        )}
                      />
                      <Label htmlFor="agreeToDataPrivacyPolicy" className="cursor-pointer text-sm font-light leading-snug text-slate-400">
                        <span className={isLightAuthTheme ? "text-slate-700" : undefined}>
                          I agree to the <Link href="/privacy-policy" target="_blank" className={cn("underline transition-colors", isLightAuthTheme ? "text-slate-950 decoration-slate-400 hover:text-sky-800" : "text-white decoration-white/30 hover:text-cyan-300")}>Data Privacy Policy</Link> *
                        </span>
                      </Label>
                    </div>
                  </div>

                  <div className="mt-6">
                    <AnimatedSubmitButton
                      type="submit"
                      status={submitStatus}
                      idleText="Create Account"
                      errorMessage={submitStatus === "error" ? error : undefined}
                      disabled={isAuthBusy || !isFormSubmittable}
                      panelVariant={submitPanelVariant}
                      className="w-full"
                    />
                  </div>
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
