"use client";

import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UpgradeRequestDetailPage() {
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
          <CardTitle>Upgrade request details are not connected yet</CardTitle>
          <CardDescription>
            Placeholder request timelines have been removed so this admin portal only shows live-backed data.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Use client contract details for current seat limits until a real upgrade workflow is implemented.
        </CardContent>
      </Card>
    </div>
  );
}
