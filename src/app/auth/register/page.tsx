"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { AuthAPI } from "@/services/auth-api";

interface SignUpData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  organization: string;
  phone?: string;
  agreeToTerms: boolean;
  agreeToDataPrivacyPolicy: boolean;
  agreeToMarketing: boolean;
}

export default function SignUpPage() {
  const [formData, setFormData] = useState<SignUpData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    organization: "",
    phone: "",
    agreeToTerms: false,
    agreeToDataPrivacyPolicy: false,
    agreeToMarketing: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { register: registerUser, isLoading } = useAuth();

  const handleInputChange = useCallback(
    (field: keyof SignUpData, value: string | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
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
    if (!formData.organization.trim()) return "Organization is required";
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
      //Get the roles from strapi to see the ids
      console.log("🔍 Fetching roles from Strapi...");
      const roles = await AuthAPI.getRoles();
      console.log("📋 All available roles:", roles);

      if (!Array.isArray(roles)) {
        console.error("getRoles() did not return an array:", roles);
        throw new Error("Failed to fetch user roles from server");
      }

      const candidateRole = roles.find((role) => role.name === "Candidate");
      console.log("🎯 Found candidate role:", candidateRole);

      if (!candidateRole) {
        console.error("Candidate role not found in roles:", roles);
        throw new Error("Candidate role not configured on server");
      }

      // Prepare data for Strapi registration - ONLY send allowed fields
      const registrationData = {
        username: formData.email, // Strapi uses username for login
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        organization: formData.organization,
        role: candidateRole.id, // Use only the ID, not the whole object
        phone: formData.phone || undefined, // Remove empty strings
        // Include the checkbox fields that are in allowedFields
        agreeToTerms: formData.agreeToTerms,
        agreeToMarketing: formData.agreeToMarketing,
        agreeToDataPrivacyPolicy: formData.agreeToDataPrivacyPolicy,
      };

      console.log("📝 Registration data being sent:", {
        ...registrationData,
        password: "[HIDDEN]",
        roleId: registrationData.role,
        roleObject: candidateRole,
      });

      // Call registration via useAuth hook (handles registration + redirect to login)
      const result = await registerUser(registrationData);
      console.log("✅ Registration result:", result);

      // Success will be handled by the useAuth hook (redirect to login)
      // No need to set success state here since we'll be redirected
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(
        err.message ||
          "An error occurred during registration. Please try again."
      );
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <Card className="shadow-2xl auth-card">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-600">
              Registration Successful!
            </CardTitle>
            <CardDescription>
              Your account has been created successfully. Please check your
              email for confirmation, then log in to complete your profile
              setup.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/auth/login">Go to Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

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
          <CardTitle className="text-2xl font-bold">Join CTRL</CardTitle>
          <CardDescription>
            Create your candidate account to begin your control room assessment
            journey
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Smith"
                  value={formData.lastName}
                  onChange={(e) =>
                    handleInputChange("lastName", e.target.value)
                  }
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john.smith@organization.com"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    required
                    disabled={isLoading}
                    className="pr-10"
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
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Organization */}
            <div className="space-y-2">
              <Label htmlFor="organization">Organization *</Label>
              <Input
                id="organization"
                type="text"
                placeholder="Metro Emergency Services"
                value={formData.organization}
                onChange={(e) =>
                  handleInputChange("organization", e.target.value)
                }
                required
                disabled={isLoading}
              />
            </div>

            {/* Phone (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                type="text"
                placeholder="+44 555 12345678"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) =>
                    handleInputChange("agreeToTerms", !!checked)
                  }
                  disabled={isLoading}
                />
                <Label htmlFor="agreeToTerms" className="text-sm leading-5">
                  I agree to the{" "}
                  <Link
                    href="/terms-conditions"
                    target="_blank"
                    className="text-primary underline"
                  >
                    Terms & Conditions
                  </Link>{" "}
                  *
                </Label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreeToDataPrivacyPolicy"
                  checked={formData.agreeToDataPrivacyPolicy}
                  onCheckedChange={(checked) =>
                    handleInputChange("agreeToDataPrivacyPolicy", !!checked)
                  }
                  disabled={isLoading}
                />
                <Label
                  htmlFor="agreeToDataPrivacyPolicy"
                  className="text-sm leading-5"
                >
                  I agree to the{" "}
                  <Link
                    href="/privacy-policy"
                    target="_blank"
                    className="text-primary underline"
                  >
                    Data Privacy Policy
                  </Link>
                  *
                </Label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreeToMarketing"
                  checked={formData.agreeToMarketing}
                  onCheckedChange={(checked) =>
                    handleInputChange("agreeToMarketing", !!checked)
                  }
                  disabled={isLoading}
                />
                <Label htmlFor="agreeToMarketing" className="text-sm leading-5">
                  I agree to receive marketing communications and updates about
                  CTRL
                </Label>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg">
              <p
                className="text-xs text-muted-foreground text-center leading-relaxed"
              >
                After creating your account, you'll complete optional equality
                monitoring questions and review additional privacy terms.
              </p>
            </div>{" "}
            <Button
              type="submit"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 w-full h-11 bg-slate-800 hover:bg-slate-200 dark:bg-blue-400 dark:hover:bg-slate-800 text-white hover:text-slate-800 dark:hover:text-white transition-all duration-200 border-0 shadow-md hover:shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Already have an account?
                </span>
              </div>
            </div>
            <Button variant="outline" className="w-full h-11" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
