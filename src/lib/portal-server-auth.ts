import "server-only";

/**
 * Stable per-user cache segment from NextAuth JWT `sub` — never cache the JWT itself.
 */
export async function getServerAuthSub(): Promise<string | null> {
  try {
    const { getToken } = await import("next-auth/jwt");
    const { cookies } = await import("next/headers");
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return null;
    }

    const token = await getToken({
      req: {
        cookies: Object.fromEntries(
          (await cookies()).getAll().map((cookie) => [cookie.name, cookie.value]),
        ),
      } as unknown as import("next/server").NextRequest,
      secret,
    });

    return typeof token?.sub === "string" && token.sub.length > 0 ? token.sub : null;
  } catch {
    return null;
  }
}
