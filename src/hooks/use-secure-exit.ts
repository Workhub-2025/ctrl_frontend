"use client";

import { useRouter } from "next/navigation";

/**
 * useSecureExit Hook
 *
 * Provides a standardized exit function for secure assessment environments.
 * Cleans up the `ctrl_secure_lock` from localStorage, and either closes 
 * the pop-out window (if opened securely) or redirects to the dashboard.
 */
export function useSecureExit() {
  const router = useRouter();

  const handleExit = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("ctrl_secure_lock");
      if (window.opener) {
        window.close(); // Close the pop-out window
      }
    }
    router.push("/candidate-dashboard/my-assessments/");
  };

  return { handleExit };
}
