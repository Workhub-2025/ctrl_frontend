'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface PublicAuthProviderProps {
  children: ReactNode;
}

export function PublicAuthProvider({ children }: PublicAuthProviderProps) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}