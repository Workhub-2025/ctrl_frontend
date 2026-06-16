"use client";

import { createContext, useContext } from "react";
import { useClientPortalState } from "@/hooks/use-client-portal";

type ClientPortalContextValue = ReturnType<typeof useClientPortalState>;

const ClientPortalContext = createContext<ClientPortalContextValue | null>(null);

export function ClientPortalProvider({ children }: { children: React.ReactNode }) {
  const value = useClientPortalState();
  return <ClientPortalContext.Provider value={value}>{children}</ClientPortalContext.Provider>;
}

export function useClientPortal() {
  const context = useContext(ClientPortalContext);
  if (!context) {
    throw new Error("useClientPortal must be used within ClientPortalProvider");
  }
  return context;
}
