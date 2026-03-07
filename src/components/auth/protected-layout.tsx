'use client';

import { AuthProvider } from '@/components/auth/auth-provider';

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return <AuthProvider>{children}</AuthProvider>;
}