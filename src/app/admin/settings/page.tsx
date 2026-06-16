"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy bookmark — settings removed; send to overview. */
export default function AdminSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin");
  }, [router]);

  return null;
}
