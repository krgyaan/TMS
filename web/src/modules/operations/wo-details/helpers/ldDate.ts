const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Max LD Date = LD Start Date + (Max LD % / LD % per week) weeks.
 * The number of days is rounded up so a partial final week is included.
 * Returns an empty string when the inputs are missing or invalid.
 */
export function calculateMaxLdDate(
  startDate: string | null | undefined,
  maxLdPercent: string | number | null | undefined,
  ldPercentPerWeek: string | number | null | undefined,
): string {
  if (!startDate) return "";

  const maxLd = toNumber(maxLdPercent);
  const perWeek = toNumber(ldPercentPerWeek);
  if (maxLd === null || perWeek === null || maxLd <= 0 || perWeek <= 0) {
    return "";
  }

  const start = new Date(`${String(startDate).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return "";

  const days = Math.ceil((maxLd / perWeek) * 7);
  const maxDate = new Date(start.getTime() + days * MS_PER_DAY);
  return maxDate.toISOString().slice(0, 10);
}
