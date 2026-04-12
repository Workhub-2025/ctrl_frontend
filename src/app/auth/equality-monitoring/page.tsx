'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import EqualityMonitoringForm from '@/components/auth/equality-monitoring-form';
import { EqualityMonitoringData } from '@/types';
import { toast } from '@/hooks/use-toast';
import { updateCurrentUserAction } from '@/app/actions/users.actions';
import { normalizeRole, routeForRole } from '@/lib/auth/role-model';

// Component that uses useSearchParams
function EqualityMonitoringContent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
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
      
      // Check if user is a candidate
      const isCandidate = normalizeRole(user.role) === 'candidate';
      
      if (!isCandidate) {
        // Non-candidates shouldn't see this form
        router.push(routeForRole(user.role));
        return;
      }
      
      // Check if already completed
      if (user?.equalityMonitoring) {
        router.push('/candidate-dashboard');
        return;
      }
    }
  }, [user, isAuthenticated, authLoading, router]);

  const handleComplete = async (data: EqualityMonitoringData) => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      console.log('💾 Saving equality monitoring data:', data);
      
      // Use the server action updateEqualityMonitoring
      const updatedUser = await updateCurrentUserAction(user.id, { equalityMonitoring: {
        ...data,
        completed: true,
        completedAt: new Date().toISOString()
      }});
      
      console.log('✅ Equality monitoring data saved successfully:', updatedUser);
      
      toast({
        title: 'Thank you!',
        description: 'Your equality monitoring information has been saved.',
      });
      
      router.push('/candidate-dashboard');
    } catch (error) {
      console.error('❌ Error saving equality monitoring:', error);
      toast({
        title: 'Error',
        description: 'Could not save your information. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    router.push('/candidate-dashboard');
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
