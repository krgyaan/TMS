/**
 * Round a money value to 2 decimal places.
 * JS float sums over decimal strings (e.g. 528344.85 + 95102.07) leave
 * IEEE-754 residue (623446.9199999999) which breaks "settled" comparisons.
 */
export const round2 = (value: unknown): number => Number((Number(value) || 0).toFixed(2));

/**
 * Maximum accepted difference (in rupees) between the effective amount and
 * paid/invoiced totals for a PO/VWO to be considered settled for closure.
 * Difference must be strictly less than this value.
 * Keep in sync with web/src/utils/money.ts.
 */
export const CLOSURE_TOLERANCE = 10;
