"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">{children}</div>
    </AuthProvider>
  );
}
