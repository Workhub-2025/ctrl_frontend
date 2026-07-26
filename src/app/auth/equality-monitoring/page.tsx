'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import EqualityMonitoringForm from '@/components/auth/equality-monitoring-form';
import { EqualityMonitoringState } from '@/types';
import { toast } from '@/hooks/use-toast';
import { UserProfileService } from '@/services/user-profile.service';
import { routeForRole } from '@/lib/auth/role-model';
import { canAccessEqualityMonitoring } from '@/lib/profile-authority';

// Component that uses useSearchParams
function EqualityMonitoringContent() {
  const { user, isAuthenticated, isLoading: authLoading, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const isOptional = searchParams.get('optional') === 'true';

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }
      
      if (!user) {
        return;
      }
      
      // Check if user can access equality monitoring
      if (!canAccessEqualityMonitoring(user.role)) {
        router.push(routeForRole(user.role));
        return;
      }
      
      // Completed or explicitly dismissed (dismissal ≠ survey completion)
      const settled =
        user?.hasCompletedEqualityMonitoring === true ||
        !!(user as { equalityPromptDismissedAt?: string | null })
          ?.equalityPromptDismissedAt ||
        (!!user?.equalityMonitoring &&
          (user.equalityMonitoring as { completed?: boolean }).completed === true);
      if (settled) {
        router.push(routeForRole(user.role));
        return;
      }
    }
  }, [user, isAuthenticated, authLoading, router]);

  const handleComplete = async (data: EqualityMonitoringState) => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      // Use updateProfile so the Zustand store and session stay in sync
      await updateProfile({ equalityMonitoring: data });
      
      toast({
        title: 'Thank you!',
        description: 'Your equality monitoring information has been saved.',
      });
      
      router.push(routeForRole(user.role));
    } catch (error) {
      console.error('Error saving equality monitoring:', error);
      toast({
        title: 'Error',
        description: 'Could not save your information. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      setIsLoading(true);
      await UserProfileService.dismissEqualityPrompt();
      toast({
        title: 'Skipped for now',
        description: 'You can complete equality monitoring later from your profile.',
      });
      router.push(routeForRole(user.role));
    } catch (error) {
      toast({
        title: 'Could not skip',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking authentication
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <EqualityMonitoringForm
      onComplete={handleComplete}
      onSkip={handleSkip}
      isLoading={isLoading}
      isOptional={isOptional}
    />
  );
}

// Loading fallback component
function EqualityMonitoringLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading form...</p>
      </div>
    </div>
  );
}

export default function EqualityMonitoringPage() {
  return (
    <Suspense fallback={<EqualityMonitoringLoading />}>
      <EqualityMonitoringContent />
    </Suspense>
  );
}
