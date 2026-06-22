export type RecoveryVersionOption = {
  version: string;
  title: string;
};

export function resolveRecoveryVersionOptions(
  catalogVersions: RecoveryVersionOption[] | undefined,
  attemptVersion?: string | null,
): RecoveryVersionOption[] {
  const byVersion = new Map<string, RecoveryVersionOption>();

  for (const option of catalogVersions ?? []) {
    const version = option.version?.trim();
    if (!version) continue;
    byVersion.set(version, {
      version,
      title: option.title?.trim() || `v${version}`,
    });
  }

  const fallbackVersion = attemptVersion?.trim() || "1.0.0";
  if (!byVersion.has(fallbackVersion)) {
    byVersion.set(fallbackVersion, {
      version: fallbackVersion,
      title:
        byVersion.size === 0
          ? `Current question bank (${fallbackVersion})`
          : `v${fallbackVersion}`,
    });
  }

  return Array.from(byVersion.values()).sort((a, b) =>
    a.version.localeCompare(b.version, undefined, { numeric: true }),
  );
}

export function resolveRecoveryContentVersion(
  action: "resume" | "restart",
  selectedVersion: string,
  attemptVersion?: string | null,
  options?: RecoveryVersionOption[],
): string | null {
  if (action === "resume") return null;

  const trimmed = selectedVersion.trim();
  if (trimmed) return trimmed;

  const resolvedOptions = options ?? resolveRecoveryVersionOptions(undefined, attemptVersion);
  return resolvedOptions[0]?.version ?? attemptVersion?.trim() ?? "1.0.0";
}
