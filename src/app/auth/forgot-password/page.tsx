"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  return (
    <div className="auth-page">
      <Card className="auth-card shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            Password reset flow is being finalized. Please contact your administrator for urgent access.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link href="/auth/register?mode=login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
