"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Settings removed — redirect legacy bookmarks to overview. */
export default function AdminSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin");
  }, [router]);

  return null;
}
