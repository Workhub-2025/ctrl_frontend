"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AdminTicketsContent } from "@/components/admin/admin-tickets-content";

function AdminTicketsPageInner() {
  const searchParams = useSearchParams();
  const escalatedTo = searchParams.get("escalatedTo");
  return (
    <AdminTicketsContent
      initialEscalatedTo={
        escalatedTo === "billing" || escalatedTo === "ops"
          ? escalatedTo
          : undefined
      }
    />
  );
}

export default function AdminTicketsPage() {
  return (
    <Suspense fallback={null}>
      <AdminTicketsPageInner />
    </Suspense>
  );
}
