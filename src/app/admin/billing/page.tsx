"use client";

import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <Button asChild variant="ghost" className="gap-2 px-0">
        <Link href="/admin">
          <ArrowLeft className="h-4 w-4" />
          Back to admin overview
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-600">
            <CreditCard className="h-5 w-5" />
          </div>
          <CardTitle>Billing is not connected yet</CardTitle>
          <CardDescription>
            This page is hidden from the admin navigation until live billing data is available.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Contract status and seat counts are currently the source of truth for client account access.
        </CardContent>
      </Card>
    </div>
  );
}
