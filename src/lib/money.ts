export function formatMoney(pence: number, currency = "gbp") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(pence / 100);
}

export function penceToPounds(pence: number) {
  return pence / 100;
}

export function poundsToPence(pounds: number) {
  if (!Number.isFinite(pounds) || pounds < 0) return 0;
  return Math.round(pounds * 100);
}

/** Format pounds for controlled input display (2 decimal places). */
export function formatPoundsInput(pence: number) {
  return (pence / 100).toFixed(2);
}

export function parsePoundsInput(value: string) {
  const normalized = value.replace(/[£,\s]/g, "");
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return poundsToPence(parsed);
}
