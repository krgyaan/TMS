export function calculateTds(amount: number, tdsPercentage: number): { tdsAmount: number; netPayable: number } {
    const tdsAmount = Math.round(((amount * tdsPercentage) / 100) * 100) / 100;
    const netPayable = Math.round((amount - tdsAmount) * 100) / 100;
    return { tdsAmount, netPayable };
}

/**
 * Compute the TDS to deduct for a single payment request against a document's
 * (PO/VWO) TDS cap. The deduction is capped so that the cumulative TDS across
 * all payment requests of the document never exceeds `poTdsAmount`.
 */
export function computeTdsDeducted(amount: number, poTdsPct: number, poTdsAmount: number, alreadyDeducted: number): number {
    if (poTdsAmount <= 0 || amount <= 0) return 0;
    const remaining = Math.max(0, poTdsAmount - alreadyDeducted);
    const prTds = (amount * poTdsPct) / 100;
    return Math.min(prTds, remaining);
}
