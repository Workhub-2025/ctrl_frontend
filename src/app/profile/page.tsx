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
import { RoleDashboardShell } from "@/components/dashboard/role-dashboard-shell";
import { isAdminRole, routeForRole } from "@/lib/auth/role-model";
import { useAuthStore } from "@/store/auth.store";

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
  const { userProfile } = useAuthStore();
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    email: "",
    organization: "",
    phone: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const userIsAdmin = isAdminRole(user?.role);
  const returnPath = routeForRole(user?.role);

  // Initialize profile data — prefer Zustand store (fresh from Strapi) over session
  useEffect(() => {
    const source = userProfile || user;
    if (source) {
      setProfileData({
        firstName: source.firstName || "",
        lastName: source.lastName || "",
        email: source.email || "",
        organization: source.organization || "",
        phone: (source as any).phone || "",
      });
    }
  }, [userProfile, user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/auth/register?mode=login";
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

      await updateProfile({
        equalityMonitoring: data,
      });

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
    <RoleDashboardShell
      title="Profile Settings"
      subtitle="Manage your account information and privacy settings"
      hideSidebar={true}
      navItems={[]}
    >
      <div className="mx-auto max-w-4xl space-y-6 py-4">
        <div className="flex items-center justify-between">
          <Link
            href={returnPath}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1 focus-visible:outline-none focus-visible:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {userIsAdmin ? "Control Panel" : "Dashboard"}
          </Link>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto whitespace-nowrap scrollbar-none bg-slate-100/80 dark:bg-[#090d16] p-1 border border-border/60 dark:border-white/5 rounded-xl gap-1">
            <TabsTrigger 
              value="profile" 
              className="flex-1 min-w-[135px] sm:min-w-0 rounded-lg data-[state=active]:bg-background dark:data-[state=active]:bg-white/10 data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all py-2.5 font-medium text-sm sm:text-base"
            >
              Profile Information
            </TabsTrigger>
            <TabsTrigger 
              value="equality" 
              className="flex-1 min-w-[135px] sm:min-w-0 rounded-lg data-[state=active]:bg-background dark:data-[state=active]:bg-white/10 data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all py-2.5 font-medium text-sm sm:text-base"
            >
              Equality Monitoring
            </TabsTrigger>
            <TabsTrigger 
              value="privacy" 
              className="flex-1 min-w-[135px] sm:min-w-0 rounded-lg data-[state=active]:bg-background dark:data-[state=active]:bg-white/10 data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all py-2.5 font-medium text-sm sm:text-base"
            >
              Privacy Settings
            </TabsTrigger>
          </TabsList>

          {/* Profile Information Tab */}
          <TabsContent value="profile" className="focus-visible:outline-none">
            <Card className="border border-border/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b1329]/40 backdrop-blur-md shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/40 dark:border-white/5 bg-slate-100/20 dark:bg-black/10">
                <CardTitle className="flex items-center gap-2.5 text-xl font-bold font-display">
                  <User className="h-5 w-5 text-primary" />
                  Personal Information
                </CardTitle>
                <CardDescription className="text-muted-foreground/90">
                  Update your basic profile information. Changes to your email
                  address may require verification.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6 sm:p-8">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-semibold">First Name *</Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      placeholder="Enter your first name"
                      className="rounded-xl border-border/70 dark:border-white/10 focus-visible:ring-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-semibold">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      placeholder="Enter your last name"
                      className="rounded-xl border-border/70 dark:border-white/10 focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled // Email changes require special handling
                    placeholder="your.email@example.com"
                    className="rounded-xl bg-slate-100/50 dark:bg-black/20 border-border/70 dark:border-white/5 text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground/85">
                    Contact support to change your email address
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization" className="text-sm font-semibold">Organization</Label>
                  <div className="relative flex items-center">
                    <Building className="absolute left-3.5 h-[18px] w-[18px] text-muted-foreground/80 pointer-events-none" />
                    <Input
                      id="organization"
                      value={profileData.organization}
                      onChange={(e) =>
                        handleInputChange("organization", e.target.value)
                      }
                      placeholder="Enter your organization"
                      className="pl-10 rounded-xl border-border/70 dark:border-white/10 focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-semibold">Phone Number (Optional)</Label>
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

                <Separator className="my-6" />

                <div className="space-y-4 rounded-xl border border-border/60 dark:border-white/5 bg-slate-100/30 dark:bg-black/10 p-5">
                  <div className="flex items-center justify-between border-b border-border/40 dark:border-white/5 pb-3">
                    <div>
                      <h3 className="font-bold text-foreground">Account Status</h3>
                      <p className="text-xs text-muted-foreground">
                        Your current account privileges
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 capitalize font-semibold rounded-lg px-2.5 py-0.5">
                        {user?.role || "Candidate"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm pt-1">
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <Calendar className="h-[18px] w-[18px] text-primary/70" />
                      <span>
                        Member since: <span className="font-medium text-foreground">{new Date().toLocaleDateString()}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <Mail className="h-[18px] w-[18px] text-primary/70" />
                      <span className="flex items-center gap-1.5">
                        Email verified: <span className="inline-flex items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 text-xs font-semibold">Verified</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={!hasUnsavedChanges || isLoading}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/20 flex items-center gap-2 rounded-xl px-5"
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
                      className="rounded-xl px-5"
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
          <TabsContent value="equality" className="focus-visible:outline-none">
            <Card className="border border-border/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b1329]/40 backdrop-blur-md shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/40 dark:border-white/5 bg-slate-100/20 dark:bg-black/10">
                <CardTitle className="flex items-center gap-2.5 text-xl font-bold font-display">
                  <Heart className="h-5 w-5 text-primary" />
                  Equality and Diversity Monitoring
                </CardTitle>
                <CardDescription className="text-muted-foreground/90">
                  Update your equality monitoring information. This data helps
                  us ensure our services are accessible and fair to everyone.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 sm:p-8">
                <EqualityMonitoringForm
                  onComplete={handleEqualityMonitoringUpdate}
                  onSkip={handleEqualityMonitoringSkip}
                  isLoading={isLoading}
                  inline={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings Tab */}
          <TabsContent value="privacy" className="focus-visible:outline-none">
            <Card className="border border-border/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b1329]/40 backdrop-blur-md shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-border/40 dark:border-white/5 bg-slate-100/20 dark:bg-black/10">
                <CardTitle className="flex items-center gap-2.5 text-xl font-bold font-display">
                  <Shield className="h-5 w-5 text-primary" />
                  Privacy Settings
                </CardTitle>
                <CardDescription className="text-muted-foreground/90">
                  Manage your privacy preferences and data handling consent.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6 sm:p-8">
                <div className="rounded-xl border border-border/60 dark:border-white/5 bg-slate-100/30 dark:bg-black/10 p-5">
                  <h3 className="font-bold text-foreground mb-3">
                    Current Privacy Preferences
                  </h3>
                  <div className="space-y-2.5 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span> Data privacy terms accepted
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span> Data processing consent given
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold">✓</span> Data retention period acknowledged
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-primary font-bold">•</span> Marketing communications:{" "}
                      <Badge variant="outline" className="ml-1 bg-background text-xs py-0 px-2 rounded-md">
                        {user?.agreeToMarketing ? "Enabled" : "Disabled"}
                      </Badge>
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-base">Data Management</h3>
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between p-4 border border-border/60 dark:border-white/5 rounded-xl bg-slate-100/10 dark:bg-black/5 hover:bg-slate-100/20 dark:hover:bg-white/5 transition-colors">
                      <div className="mr-4">
                        <p className="font-semibold text-sm">Download My Data</p>
                        <p className="text-xs text-muted-foreground">
                          Get a copy of all data we have about you
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-lg shrink-0">
                        Request Export
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-border/60 dark:border-white/5 rounded-xl bg-red-500/5 hover:bg-red-500/10 dark:bg-red-950/5 dark:hover:bg-red-950/10 transition-colors border-red-500/20 dark:border-red-500/10">
                      <div className="mr-4">
                        <p className="font-semibold text-sm text-red-600 dark:text-red-400">Delete My Account</p>
                        <p className="text-xs text-muted-foreground">
                          Permanently delete your account and all associated data
                        </p>
                      </div>
                      <Button variant="destructive" size="sm" className="rounded-lg bg-red-600 hover:bg-red-700 shrink-0">
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 dark:border-white/5 bg-slate-100/30 dark:bg-black/10 p-5">
                  <h4 className="font-bold text-sm text-foreground mb-3">
                    Important Information
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Assessment data is retained for 7 years as per employment law requirements.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Equality monitoring data is anonymized after 12 months.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>You can withdraw consent at any time by contacting support.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Data deletion requests are processed within 30 days.</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleDashboardShell>
  );
}
