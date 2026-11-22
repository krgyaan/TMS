import { toIstDateParts, toIstIsoDate, toTallyDate } from "./ist-date";

describe("toTallyDate", () => {
    it("formats the IST calendar day as YYYYMMDD regardless of the process timezone", () => {
        expect(toTallyDate(new Date("2026-01-05T00:00:00.000Z"))).toBe("20260105");
        expect(toTallyDate(new Date("2026-12-31T12:00:00.000Z"))).toBe("20261231");
    });

    it("rolls over at IST midnight, not UTC midnight", () => {
        expect(toTallyDate(new Date("2026-01-04T18:29:59.999Z"))).toBe("20260104");
        expect(toTallyDate(new Date("2026-01-04T18:30:00.000Z"))).toBe("20260105");
    });

    it("rejects invalid dates", () => {
        expect(() => toTallyDate(new Date("not-a-date"))).toThrow(/Invalid date/);
    });
});

describe("toIstDateParts", () => {
    it("returns the IST calendar parts", () => {
        expect(toIstDateParts(new Date("2026-01-04T18:30:00.000Z"))).toEqual({ year: 2026, month: 1, day: 5 });
    });
});

describe("toIstIsoDate", () => {
    it("formats the IST calendar day as YYYY-MM-DD", () => {
        expect(toIstIsoDate(new Date("2026-01-04T18:30:00.000Z"))).toBe("2026-01-05");
    });
});
