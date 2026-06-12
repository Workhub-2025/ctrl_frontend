"use client";

import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";

export default function BillingPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <HiringManagerPageHeader
        eyebrow="Billing"
        title="Billing ledger"
        description="Billing details and transactions are hidden until active integration is established."
        icon={CreditCard}
        action={
          <Button asChild variant="outline" className="border-white/10 hover:bg-white/10 text-slate-200">
            <Link href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to overview
            </Link>
          </Button>
        }
      />

      <Card className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 dark:border-white/5 dark:bg-[#0b1329]/25 shadow-sm backdrop-blur-md">
        <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
        <CardHeader className="space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 shadow-sm">
            <CreditCard className="h-5 w-5" />
          </div>
          <CardTitle className="text-base font-bold text-white">Billing is not connected yet</CardTitle>
          <CardDescription className="text-slate-400">
            This page is hidden from the admin navigation until live billing data is available.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-slate-400">
          Contract status and seat counts are currently the source of truth for client account access.
        </CardContent>
      </Card>
    </div>
  );
}

