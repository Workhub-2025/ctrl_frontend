import { UK_LEGAL } from "@/lib/legal/uk-compliance";

export const PLATFORM_DEFAULT_RETENTION_MONTHS = UK_LEGAL.assessmentDataRetentionYears * 12;

export function formatRetentionPeriod(months: number): string {
  const years = Math.floor(months / 12);
  const remainder = months % 12;

  if (remainder === 0) {
    return years === 1 ? "1 year" : `${years} years`;
  }

  const yearPart = years > 0 ? `${years} year${years === 1 ? "" : "s"}` : "";
  const monthPart = `${remainder} month${remainder === 1 ? "" : "s"}`;
  return yearPart ? `${yearPart}, ${monthPart}` : monthPart;
}

export function resolveEffectiveRetentionMonths(
  contractConfiguredMonths: number | null | undefined,
  platformDefaultMonths = PLATFORM_DEFAULT_RETENTION_MONTHS,
): number {
  if (
    typeof contractConfiguredMonths === "number"
    && Number.isInteger(contractConfiguredMonths)
    && contractConfiguredMonths > 0
  ) {
    return contractConfiguredMonths;
  }
  return platformDefaultMonths;
}
