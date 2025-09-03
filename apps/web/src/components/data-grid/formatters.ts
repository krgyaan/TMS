import type { ValueFormatterParams } from "ag-grid-community";

export function dateFormatter(params: ValueFormatterParams): string {
  if (!params.value) return "";
  const d = new Date(params.value);
  if (isNaN(d.getTime())) return String(params.value);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function currencyFormatter(
  params: ValueFormatterParams,
  options: { locale?: string; currency?: string; maximumFractionDigits?: number } = {}
): string {
  const { locale = "en-IN", currency = "INR", maximumFractionDigits = 0 } = options;
  const value = typeof params.value === "number" ? params.value : Number(params.value);
  if (!isFinite(value)) return "";
  try {
    return value.toLocaleString(locale, {
      style: "currency",
      currency,
      maximumFractionDigits,
    });
  } catch {
    return String(value);
  }
}
