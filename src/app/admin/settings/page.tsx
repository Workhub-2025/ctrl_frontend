"use client";

import Link from "next/link";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminSettingsPage() {
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
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <CardTitle>Platform settings are not connected yet</CardTitle>
          <CardDescription>
            The previous settings page was placeholder-only and has been removed from navigation.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Real admin controls currently live on client records: contracts, seat capacity, client invites, and enabled client features.
        </CardContent>
      </Card>
    </div>
  );
}
