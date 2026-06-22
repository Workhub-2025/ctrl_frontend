"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { UserProfileService } from "@/services/user-profile.service";
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
  Download,
  Trash2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import EqualityMonitoringForm from "@/components/auth/equality-monitoring-form";
import { EqualityMonitoringData, IUser } from "@/types";
import Link from "next/link";
import { TelInput } from "@/components/ui/telInput";
import { PortalMinimalShell } from "@/components/dashboard/portal/portal-minimal-shell";
import { isAdminRole, routeForRole } from "@/lib/auth/role-model";
import { useAuthStore } from "@/store/auth.store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  phone: string;
}

const profileTabListClass =
  "flex h-auto min-h-10 w-full flex-nowrap items-stretch justify-start gap-1 overflow-x-auto rounded-xl border border-border/60 bg-slate-100/80 p-1 no-scrollbar dark:border-white/5 dark:bg-[#090d16] md:grid md:grid-cols-3 md:overflow-visible";

const profileTabTriggerClass =
  "shrink-0 min-w-0 rounded-lg px-2 py-2 text-center text-[11px] font-medium leading-tight whitespace-nowrap transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm dark:data-[state=active]:bg-white/10 sm:px-3 sm:text-xs md:w-full md:px-2 md:py-2.5 md:text-sm";

export default function ProfilePage() {
  const {
    user,
    updateProfile,
    isLoading: authLoading,
    isAuthenticated,
  } = useAuth();
  const { userProfile, setUserProfile } = useAuthStore();
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    email: "",
    organization: "",
    phone: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const userIsAdmin = isAdminRole(user?.role);
  const returnPath = routeForRole(user?.role);

  // Load fresh profile from BFF (phone, privacy, equality fields)
  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setIsProfileLoading(true);
      const profile = await UserProfileService.getProfile();
      if (cancelled) return;

      if (profile) {
        setUserProfile(profile as IUser);
        setProfileData({
          firstName: profile.firstName || "",
          lastName: profile.lastName || "",
          email: profile.email || "",
          organization: profile.organization || "",
          phone: profile.phone || "",
        });
      }
      setIsProfileLoading(false);
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, setUserProfile]);

  // Fallback when store/session updates before BFF fetch completes
  useEffect(() => {
    if (isProfileLoading) return;

    const source = userProfile || user;
    if (source) {
      setProfileData({
        firstName: source.firstName || "",
        lastName: source.lastName || "",
        email: source.email || "",
        organization: source.organization || "",
        phone: (source as IUser).phone || "",
      });
    }
  }, [userProfile, user, isProfileLoading]);

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
        equalityMonitoring: {
          ...data,
          _submittedAt: new Date().toISOString(),
        },
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

  const handleDataExport = async () => {
    try {
      setIsExporting(true);
      await UserProfileService.downloadDataExport();
      toast({
        title: "Export ready",
        description: "Your data export has been downloaded.",
      });
    } catch (error: unknown) {
      toast({
        title: "Export failed",
        description:
          error instanceof Error ? error.message : "We could not export your data.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleErasureRequest = async () => {
    try {
      setIsErasing(true);
      const result = await UserProfileService.requestErasure();
      toast({
        title:
          result.data.status === "completed"
            ? "Account closed"
            : "Erasure request received",
        description: result.data.message,
      });
      if (result.data.status === "completed") {
        window.location.href = "/auth/register?mode=login";
      }
    } catch (error: unknown) {
      toast({
        title: "Request failed",
        description:
          error instanceof Error ? error.message : "We could not process your request.",
        variant: "destructive",
      });
    } finally {
      setIsErasing(false);
    }
  };

  if (authLoading || isProfileLoading) {
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
    <PortalMinimalShell
      homeHref={returnPath}
      title="Profile Settings"
      subtitle="Manage your account information and privacy settings"
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-6 py-4">
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
          <TabsList className={profileTabListClass}>
            <TabsTrigger value="profile" className={profileTabTriggerClass}>
              Profile Information
            </TabsTrigger>
            <TabsTrigger value="equality" className={profileTabTriggerClass}>
              Equality Monitoring
            </TabsTrigger>
            <TabsTrigger value="privacy" className={profileTabTriggerClass}>
              Privacy Settings
            </TabsTrigger>
          </TabsList>

          {/* Profile Information Tab */}
          <TabsContent value="profile" className="focus-visible:outline-none">
            <Card className="border border-border/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b1329]/40 backdrop-blur-md shadow-lg rounded-2xl">
              <CardHeader className="border-b border-border/40 dark:border-white/5 bg-slate-100/20 dark:bg-black/10 rounded-t-2xl">
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
                        const source = userProfile || user;
                        if (source) {
                          setProfileData({
                            firstName: source.firstName || "",
                            lastName: source.lastName || "",
                            email: source.email || "",
                            organization: source.organization || "",
                            phone: (source as IUser).phone || "",
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
                        {userProfile?.agreeToMarketing ?? user?.agreeToMarketing
                          ? "Enabled"
                          : "Disabled"}
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg shrink-0"
                        onClick={() => void handleDataExport()}
                        disabled={isExporting}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {isExporting ? "Preparing…" : "Request Export"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-border/60 dark:border-white/5 rounded-xl bg-red-500/5 hover:bg-red-500/10 dark:bg-red-950/5 dark:hover:bg-red-950/10 transition-colors border-red-500/20 dark:border-red-500/10">
                      <div className="mr-4">
                        <p className="font-semibold text-sm text-red-600 dark:text-red-400">Delete My Account</p>
                        <p className="text-xs text-muted-foreground">
                          Permanently delete your account and all associated data
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-lg bg-red-600 hover:bg-red-700 shrink-0"
                            disabled={isErasing}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {isErasing ? "Processing…" : "Delete Account"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Request account deletion?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will close your account and remove personal identifiers where
                              possible. Assessment records may be retained in pseudonymised form
                              where your recruiting organisation has a lawful basis. Organisation
                              admin accounts are reviewed manually within 30 days.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => void handleErasureRequest()}
                            >
                              Confirm deletion request
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
    </PortalMinimalShell>
  );
}
