export const GEM_GST_RATE = 18;
export const GEM_TDS_RATE = 2;

export interface GemChargesBreakdown {
    preGst: number;
    gstAmount: number;
    totalPayable: number;
    tdsAmount: number;
    netPayable: number;
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export function computeGemChargesBreakdown(preGstInput: number | string | null | undefined): GemChargesBreakdown {
    const preGst = round2(Math.max(0, Number(preGstInput) || 0));
    const gstAmount = round2((preGst * GEM_GST_RATE) / 100);
    const totalPayable = round2(preGst + gstAmount);
    const tdsAmount = round2((preGst * GEM_TDS_RATE) / 100);
    const netPayable = round2(totalPayable - tdsAmount);

    return { preGst, gstAmount, totalPayable, tdsAmount, netPayable };
}
