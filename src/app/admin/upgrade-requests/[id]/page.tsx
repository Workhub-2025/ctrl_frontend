"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy route — entitlements are managed on the list page with ?client= deep links. */
export default function UpgradeRequestDetailRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/upgrade-requests");
  }, [router]);

  return null;
}
