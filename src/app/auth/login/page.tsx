import { redirect } from "next/navigation";

type LoginSearchParams = Promise<{
  callbackUrl?: string;
  email?: string;
  error?: string;
  message?: string;
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: LoginSearchParams;
}) {
  const params = await searchParams;
  const target = new URLSearchParams({ mode: "login" });

  for (const key of ["callbackUrl", "email", "error", "message"] as const) {
    const value = params?.[key];
    if (typeof value === "string" && value.length > 0) {
      target.set(key, value);
    }
  }

  redirect(`/auth/register?${target.toString()}`);
}
