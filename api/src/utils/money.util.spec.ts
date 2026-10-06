import { round2, CLOSURE_TOLERANCE } from "./money.util";

describe("round2", () => {
    it("removes float residue from decimal string sums", () => {
        expect(round2(Number("528344.85") + Number("95102.07"))).toBe(623446.92);
    });

    it("rounds to 2 decimal places", () => {
        expect(round2(10.005)).toBe(10.01);
        expect(round2("623446.9199999999")).toBe(623446.92);
    });

    it("returns 0 for null, undefined and non-numeric values", () => {
        expect(round2(null)).toBe(0);
        expect(round2(undefined)).toBe(0);
        expect(round2("abc")).toBe(0);
    });
});

describe("CLOSURE_TOLERANCE", () => {
    it("accepts differences strictly below 10 rupees", () => {
        expect(9.99 < CLOSURE_TOLERANCE).toBe(true);
        expect(0 < CLOSURE_TOLERANCE).toBe(true);
        expect(10 < CLOSURE_TOLERANCE).toBe(false);
        expect(10.01 < CLOSURE_TOLERANCE).toBe(false);
    });
});
