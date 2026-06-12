"use client";

import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UpgradeRequestsPage() {
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
            <Construction className="h-5 w-5" />
          </div>
          <CardTitle>Upgrade requests are not connected yet</CardTitle>
          <CardDescription>
            This route used to show placeholder upgrade data. It is hidden from the admin navigation until a real upgrade-request API exists.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Seat capacity is currently managed from the client contract record. Use the client detail page to review live seat usage and contract limits.
        </CardContent>
      </Card>
    </div>
  );
}
