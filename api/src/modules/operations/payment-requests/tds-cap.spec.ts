import { computeTdsDeducted } from "./payment-request.service";

const PO_TDS_PCT = 2;
const PO_TDS_AMOUNT = 1400;

describe("computeTdsDeducted", () => {
    it("deducts full 2% while within the remaining TDS budget", () => {
        expect(computeTdsDeducted(50000, PO_TDS_PCT, PO_TDS_AMOUNT, 0)).toBe(1000);
    });

    it("caps the deduction to the remaining TDS budget", () => {
        expect(computeTdsDeducted(25000, PO_TDS_PCT, PO_TDS_AMOUNT, 1000)).toBe(400);
    });

    it("never lets cumulative deductions exceed the PO TDS amount", () => {
        const first = computeTdsDeducted(50000, PO_TDS_PCT, PO_TDS_AMOUNT, 0);
        const second = computeTdsDeducted(25000, PO_TDS_PCT, PO_TDS_AMOUNT, first);
        expect(first).toBe(1000);
        expect(second).toBe(400);
        expect(first + second).toBe(PO_TDS_AMOUNT);
    });

    it("returns 0 once the cap is exhausted (idempotent re-run)", () => {
        expect(computeTdsDeducted(50000, PO_TDS_PCT, PO_TDS_AMOUNT, PO_TDS_AMOUNT)).toBe(0);
    });

    it("returns 0 for a PO without TDS", () => {
        expect(computeTdsDeducted(50000, 0, 0, 0)).toBe(0);
        expect(computeTdsDeducted(50000, PO_TDS_PCT, 0, 0)).toBe(0);
    });

    it("returns 0 when no TDS is due on the payment amount", () => {
        expect(computeTdsDeducted(0, PO_TDS_PCT, PO_TDS_AMOUNT, 0)).toBe(0);
    });

    describe("194Q @ 0.10%", () => {
        // Cap is on the pre-GST subtotal (0.10% of 1,00,000 = 100); the payment
        // request may be GST-inclusive (1,18,000).
        const CAP = 100;

        it("caps a GST-inclusive payment at the pre-GST document amount", () => {
            expect(computeTdsDeducted(118000, 0.1, CAP, 0)).toBe(CAP);
        });

        it("never lets cumulative 0.10% deductions exceed the cap", () => {
            const first = computeTdsDeducted(59000, 0.1, CAP, 0);
            const second = computeTdsDeducted(59000, 0.1, CAP, first);
            expect(first).toBe(59);
            expect(second).toBe(41);
            expect(first + second).toBe(CAP);
        });

        it("returns 0 once a 0.10% cap is exhausted", () => {
            expect(computeTdsDeducted(59000, 0.1, CAP, CAP)).toBe(0);
        });
    });
});
