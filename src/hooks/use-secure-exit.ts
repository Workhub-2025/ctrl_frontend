"use client";

import { useRouter } from "next/navigation";
import { getCandidateAssessmentsReturnPath } from "@/lib/assessment-completion";

/**
 * useSecureExit Hook
 *
 * Provides a standardized exit function for secure assessment environments.
 * Cleans up the `ctrl_secure_lock` from localStorage, and either closes 
 * the pop-out window (if opened securely) or redirects to the dashboard.
 */
export function useSecureExit(candidateSessionDocumentId?: string | null) {
  const router = useRouter();

  const handleExit = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("ctrl_secure_lock");
      if (window.opener) {
        window.close();
        return;
      }
    }

    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    const sessionId =
      candidateSessionDocumentId ?? params?.get("candidateSessionDocumentId");

    router.push(getCandidateAssessmentsReturnPath(sessionId));
  };

  return { handleExit };
}
