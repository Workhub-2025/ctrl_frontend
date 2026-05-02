'use client';

import { useEffect, useState } from 'react';

/**
 * Wrapper para hidratar stores con persist en App Router.
 * Evita hydration mismatch entre SSR y cliente cuando se usa
 * el middleware `persist` de Zustand con localStorage.
 */
export function StoreHydration({ children }: Readonly<{ children: React.ReactNode }>) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  return <>{children}</>;
}
