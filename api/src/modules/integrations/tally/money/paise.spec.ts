import { formatTallyAmount, sumPaise, toPaise } from "./paise";

describe("toPaise", () => {
    it("accepts plain decimal strings with up to two fractional digits", () => {
        expect(toPaise("0")).toBe(0);
        expect(toPaise("1")).toBe(100);
        expect(toPaise("1.5")).toBe(150);
        expect(toPaise("1234.50")).toBe(123450);
        expect(toPaise(" 42.05 ")).toBe(4205);
    });

    it("accepts integers and bigints", () => {
        expect(toPaise(42)).toBe(4200);
        expect(toPaise(42n)).toBe(4200);
    });

    it("preserves the sign", () => {
        expect(toPaise("-1.25")).toBe(-125);
    });

    it("rejects amounts that would need rounding", () => {
        expect(() => toPaise("1.234")).toThrow(/at most two/);
        expect(() => toPaise(0.1 + 0.2)).toThrow(/at most two/);
    });

    it("rejects exponents, empty and non-numeric values", () => {
        expect(() => toPaise("1e3")).toThrow();
        expect(() => toPaise("")).toThrow(/must not be empty/);
        expect(() => toPaise("abc")).toThrow();
        expect(() => toPaise("1,000")).toThrow();
        expect(() => toPaise(null)).toThrow();
        expect(() => toPaise(Number.POSITIVE_INFINITY)).toThrow(/finite/);
    });

    it("rejects values beyond the safe integer range", () => {
        expect(() => toPaise("999999999999999999999")).toThrow(/too large/);
    });
});

describe("sumPaise", () => {
    it("sums whole paise exactly", () => {
        expect(sumPaise([100, 250, 5])).toBe(355);
        expect(sumPaise([])).toBe(0);
    });
});

describe("formatTallyAmount", () => {
    it("formats paise as a two-decimal amount", () => {
        expect(formatTallyAmount(0)).toBe("0.00");
        expect(formatTallyAmount(5)).toBe("0.05");
        expect(formatTallyAmount(150)).toBe("1.50");
        expect(formatTallyAmount(-125)).toBe("-1.25");
        expect(formatTallyAmount(123450)).toBe("1234.50");
    });

    it("rejects non-integer input", () => {
        expect(() => formatTallyAmount(1.5)).toThrow(/safe integer/);
    });
});
