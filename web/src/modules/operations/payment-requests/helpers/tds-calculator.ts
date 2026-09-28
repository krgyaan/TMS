export function calculateTds(amount: number, tdsPercentage: number): { tdsAmount: number; netPayable: number } {
    const tdsAmount = Math.round((amount * tdsPercentage) / 100 * 100) / 100;
    const netPayable = Math.round((amount - tdsAmount) * 100) / 100;
    return { tdsAmount, netPayable };
}
