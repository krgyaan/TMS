import {
    getIstDateKey,
    getIstDateOnly,
    getIstDayOfMonth,
    getIstDayOfWeek,
    getIstHours,
    getIstMinutes,
    getIstTimeKey,
    istDaysBetween,
} from "./ist-date";

describe("ist-date helpers", () => {
    it("derives the IST calendar date from a UTC instant", () => {
        expect(getIstDateKey(new Date("2026-01-05T04:40:00.000Z"))).toBe("2026-01-05");
        expect(getIstDateKey(new Date("2026-01-05T20:00:00.000Z"))).toBe("2026-01-06");
    });

    it("derives IST time and day parts", () => {
        const date = new Date("2026-01-05T04:40:00.000Z");

        expect(getIstTimeKey(date)).toBe("1010");
        expect(getIstHours(date)).toBe(10);
        expect(getIstMinutes(date)).toBe(10);
        expect(getIstDayOfWeek(date)).toBe(1);
        expect(getIstDayOfMonth(date)).toBe(5);
    });

    it("returns a UTC-midnight date representing the IST day", () => {
        const dateOnly = getIstDateOnly(new Date("2026-01-05T20:00:00.000Z"));

        expect(dateOnly.toISOString()).toBe("2026-01-06T00:00:00.000Z");
    });

    it("computes whole-day differences between IST dates", () => {
        expect(istDaysBetween("2026-01-01", "2026-01-03")).toBe(2);
        expect(istDaysBetween(new Date("2026-01-01T00:00:00.000Z"), "2026-01-02")).toBe(1);
    });
});
