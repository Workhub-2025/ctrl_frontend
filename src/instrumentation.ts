export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { warnIfProductionSecurityGaps } = await import("@/lib/security/env-check");
    warnIfProductionSecurityGaps();
  }
}
