"use client";

import { createContext, useContext } from "react";
import {
  useCandidateApplications,
  type UseCandidateApplicationsResult,
} from "@/hooks/use-candidate-applications";

const CandidatePortalContext = createContext<UseCandidateApplicationsResult | null>(null);

export function CandidatePortalProvider({ children }: { children: React.ReactNode }) {
  const value = useCandidateApplications();
  return (
    <CandidatePortalContext.Provider value={value}>{children}</CandidatePortalContext.Provider>
  );
}

export function useCandidatePortal() {
  const context = useContext(CandidatePortalContext);
  if (!context) {
    throw new Error("useCandidatePortal must be used within CandidatePortalProvider");
  }
  return context;
}
