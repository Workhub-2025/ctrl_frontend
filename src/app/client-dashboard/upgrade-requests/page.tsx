import { redirect } from "next/navigation";

/** @deprecated Use /client-dashboard/billing. Remove after 2026-10-31. */
export default async function ClientUpgradeRequestsRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      for (const entry of value) {
        query.append(key, entry);
      }
    }
  }
  const suffix = query.toString();
  redirect(
    suffix
      ? `/client-dashboard/billing?${suffix}`
      : "/client-dashboard/billing",
  );
}
