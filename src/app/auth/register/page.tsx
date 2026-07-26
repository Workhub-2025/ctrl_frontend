import { redirect } from "next/navigation";

/** @deprecated Public registration is closed. Remove after 2026-10-31. */
export default async function RegistrationRedirect({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const source = await searchParams;
  const target = new URLSearchParams();
  for (const key of ["callbackUrl", "email", "error", "message", "totp"] as const) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0) {
      target.set(key, value);
    }
  }
  const query = target.toString();
  redirect(query ? `/auth/login?${query}` : "/auth/login");
}
