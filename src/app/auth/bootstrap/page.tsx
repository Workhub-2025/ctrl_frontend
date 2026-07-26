"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminFirstLoginSecurityDialog } from "@/components/auth/admin-first-login-security-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdministratorBootstrapStatusResponse } from "@/lib/firebase-provisioning-contracts";
import { getFirebaseBrowserAuth } from "@/lib/firebase-client";

async function readData<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: string;
  };
  if (!response.ok || !body.data) {
    throw new Error(body.error ?? "Request failed");
  }
  return body.data;
}

/**
 * Dedicated bootstrap route kept as a fallback deep-link. First-time admin
 * setup now prefers the modal on `/auth/login`; this page opens the same dialog.
 */
export default function AdministratorBootstrapPage() {
  const router = useRouter();
  const [status, setStatus] = useState<AdministratorBootstrapStatusResponse | null>(null);
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/bootstrap/status", { cache: "no-store" })
      .then((response) => readData<AdministratorBootstrapStatusResponse>(response))
      .then((nextStatus) => {
        setStatus(nextStatus);
        if (nextStatus.status === "completed") {
          router.replace("/admin");
          return;
        }
        const currentEmail = getFirebaseBrowserAuth().currentUser?.email?.trim().toLowerCase() ?? "";
        setEmail(currentEmail);
        setOpen(Boolean(currentEmail) && nextStatus.status === "pending");
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Bootstrap unavailable");
      });
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-6 px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Administrator setup</CardTitle>
          <CardDescription>
            Complete password, authenticator and profile setup in the secure dialog.
            Status: {status?.status ?? "checking"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          {!email ? (
            <p className="text-sm text-muted-foreground">
              Sign in first, then return here or use the login dialog when prompted.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button type="button" disabled={!email || status?.status !== "pending"} onClick={() => setOpen(true)}>
              Open security setup
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/auth/login")}>
              Back to sign-in
            </Button>
          </div>
        </CardContent>
      </Card>

      <AdminFirstLoginSecurityDialog
        open={open}
        email={email}
        onOpenChange={setOpen}
        onCompleted={(redirectPath) => {
          window.location.assign(redirectPath);
        }}
      />
    </main>
  );
}
