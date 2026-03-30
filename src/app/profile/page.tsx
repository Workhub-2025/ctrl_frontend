"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Shield,
  Heart,
  Mail,
  Phone,
  Building,
  Calendar,
  Save,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import EqualityMonitoringForm from "@/components/auth/equality-monitoring-form";
import { EqualityMonitoringData, IUser } from "@/types";
import Link from "next/link";
import { TelInput } from "@/components/ui/telInput";
import { updateCurrentUserAction } from "@/app/actions/users.actions";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  phone: string;
}

export default function ProfilePage() {
  const {
    user,
    updateProfile,
    isLoading: authLoading,
    isAuthenticated,
  } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    email: "",
    organization: "",
    phone: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize profile data from user session
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        organization: user.organization || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/auth/login";
    }
  }, [authLoading, isAuthenticated]);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);

      await updateProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        organization: profileData.organization,
        phone: profileData.phone,
        // Note: Email updates might require additional verification
      });

      setHasUnsavedChanges(false);
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description:
          error.message || "There was an error updating your profile.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEqualityMonitoringUpdate = async (
    data: EqualityMonitoringData
  ) => {
    try {
      setIsLoading(true);

      if (!user) {
        throw new Error("User not authenticated");
      }

      const response = await updateCurrentUserAction(user.id, {
        equalityMonitoring: data,
      });

      if (!response?.data?.id) {
        throw new Error("Failed to update equality monitoring data");
      }

      toast({
        title: "Equality Monitoring Updated",
        description:
          "Your equality and diversity information has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description:
          error.message ||
          "There was an error updating your equality monitoring data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEqualityMonitoringSkip = () => {
    toast({
      title: "No Changes Made",
      description: "Your equality monitoring information remains unchanged.",
    });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="space-y-6">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Profile Settings
              </h1>
              <p className="text-muted-foreground">
                Manage your account information and privacy settings
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href={user?.role === "Admin" ? "/admin" : "/dashboard"}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border rounded-lg hover:bg-accent"
              >
                <ArrowLeft className="h-4 w-4" />
                Return to{" "}
                {user?.role === "Admin" ? "Control Panel" : "Dashboard"}
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile Information</TabsTrigger>
            <TabsTrigger value="equality">Equality Monitoring</TabsTrigger>
            <TabsTrigger value="privacy">Privacy Settings</TabsTrigger>
          </TabsList>

          {/* Profile Information Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your basic profile information. Changes to your email
                  address may require verification.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      placeholder="Enter your first name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled // Email changes require special handling
                    placeholder="your.email@example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Contact support to change your email address
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="organization"
                      value={profileData.organization}
                      onChange={(e) =>
                        handleInputChange("organization", e.target.value)
                      }
                      placeholder="Enter your organization"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <TelInput
                    id="phone"
                    name="phone"
                    value={profileData.phone}
                    placeholder="Enter your phone number"
                    onValueChange={(number, isValid) => {
                      handleInputChange("phone", number);
                    }}
                    initialCountry="us"
                    nationalMode={false}
                    separateDialCode={true}
                    className="w-full"
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Account Status</h3>
                      <p className="text-sm text-muted-foreground">
                        Your current account information
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="secondary">
                        {user?.role || "Candidate"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Member since: {new Date().toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>Email verified: ✓</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={!hasUnsavedChanges || isLoading}
                    className="flex items-center gap-2"
                  >
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Changes
                  </Button>

                  {hasUnsavedChanges && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Reset to original values
                        if (user) {
                          setProfileData({
                            firstName: user.firstName || "",
                            lastName: user.lastName || "",
                            email: user.email || "",
                            organization: user.organization || "",
                            phone: user.phone || "",
                          });
                          setHasUnsavedChanges(false);
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Equality Monitoring Tab */}
          <TabsContent value="equality">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Equality and Diversity Monitoring
                </CardTitle>
                <CardDescription>
                  Update your equality monitoring information. This data helps
                  us ensure our services are accessible and fair to everyone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-lg border border-border/70 bg-muted/40 p-4">
                    <h3 className="font-semibold tracking-tight text-2xl font-headline mb-3">
                      About This Information
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      All equality monitoring questions are optional. This
                      information helps us monitor whether our services are
                      reaching all sections of the community and being delivered
                      fairly to everyone.
                    </p>
                  </div>

                  <EqualityMonitoringForm
                    onComplete={handleEqualityMonitoringUpdate}
                    onSkip={handleEqualityMonitoringSkip}
                    isLoading={isLoading}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings Tab */}
          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy Settings
                </CardTitle>
                <CardDescription>
                  Manage your privacy preferences and data handling consent.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border border-border/70 bg-muted/40 p-4">
                  <h3 className="font-semibold tracking-tight text-2xl font-headline mb-2">
                    Current Privacy Preferences
                  </h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>✓ Data privacy terms accepted</p>
                    <p>✓ Data processing consent given</p>
                    <p>✓ Data retention period acknowledged</p>
                    <p>
                      {" "}
                      ? Marketing communications:{" "}
                      {user?.agreeToMarketing ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Data Management</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Download My Data</p>
                        <p className="text-sm text-muted-foreground">
                          Get a copy of all data we have about you
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Request Export
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Delete My Account</p>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete your account and all associated
                          data
                        </p>
                      </div>
                      <Button variant="destructive" size="sm">
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/40 p-4">
                  <h4 className="font-semibold tracking-tight text-2xl font-headline mb-2">
                    Important Information
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                      • Assessment data is retained for 7 years as per
                      employment law requirements
                    </li>
                    <li>
                      • Equality monitoring data is anonymized after 12 months
                    </li>
                    <li>
                      • You can withdraw consent at any time by contacting
                      support
                    </li>
                    <li>
                      • Data deletion requests are processed within 30 days
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
