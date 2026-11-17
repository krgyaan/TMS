import { computeGemChargesBreakdown, gemBreakdownToDbColumns } from './gem-charges.helper';

describe('computeGemChargesBreakdown', () => {
    it('computes GST @ 18% and TDS @ 2% on the pre-GST amount', () => {
        expect(computeGemChargesBreakdown(100000)).toEqual({
            preGst: 100000,
            gstAmount: 18000,
            totalPayable: 118000,
            tdsAmount: 2000,
            netPayable: 116000,
        });
    });

    it('rounds each derived line to two decimals', () => {
        expect(computeGemChargesBreakdown(1234.56)).toEqual({
            preGst: 1234.56,
            gstAmount: 222.22,
            totalPayable: 1456.78,
            tdsAmount: 24.69,
            netPayable: 1432.09,
        });
    });

    it('treats zero, null and undefined as zero', () => {
        const expected = { preGst: 0, gstAmount: 0, totalPayable: 0, tdsAmount: 0, netPayable: 0 };
        expect(computeGemChargesBreakdown(0)).toEqual(expected);
        expect(computeGemChargesBreakdown(null)).toEqual(expected);
        expect(computeGemChargesBreakdown(undefined)).toEqual(expected);
    });

    it('never returns negative values for negative input', () => {
        expect(computeGemChargesBreakdown(-500).preGst).toBe(0);
    });

    it('formats DB column values as numeric strings', () => {
        expect(gemBreakdownToDbColumns(100)).toEqual({
            gemChargesPreGstAmount: '100.00',
            gemChargesGstAmount: '18.00',
            gemChargesTotalPayable: '118.00',
            gemChargesTdsAmount: '2.00',
            gemChargesNetPayable: '116.00',
        });
    });
});
