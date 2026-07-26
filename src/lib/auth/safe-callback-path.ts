const CALLBACK_BASE_ORIGIN = "https://ctrl.invalid";

/**
 * Accepts only a normalized same-origin absolute path.
 *
 * Backslashes are rejected before URL parsing because browsers normalize them
 * as path separators and values such as `/\attacker.example` become external
 * network-path references.
 */
export function safeCallbackPath(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    return null;
  }

  try {
    const parsed = new URL(value, CALLBACK_BASE_ORIGIN);
    if (parsed.origin !== CALLBACK_BASE_ORIGIN) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
