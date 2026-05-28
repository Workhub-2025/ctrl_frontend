'use client';

import { ReactNode } from 'react';

interface PublicAuthProviderProps {
  children: ReactNode;
}

export function PublicAuthProvider({ children }: PublicAuthProviderProps) {
  return <>{children}</>;
}
