import { getFollowupWindow } from "./follow-up.windows";

// UTC instants below correspond to the IST wall-clock time in the comments.
describe("getFollowupWindow", () => {
    it("matches daily at 10:10 IST on a weekday", () => {
        expect(getFollowupWindow(new Date("2026-01-05T04:40:00.000Z"))?.frequency).toBe(1);
    });

    it("matches weekly on Monday at 10:20 IST", () => {
        expect(getFollowupWindow(new Date("2026-01-05T04:50:00.000Z"))?.frequency).toBe(4);
    });

    it("matches twice-daily windows at 10:25 and 16:25 IST", () => {
        expect(getFollowupWindow(new Date("2026-01-05T04:55:00.000Z"))?.frequency).toBe(3);
        expect(getFollowupWindow(new Date("2026-01-05T10:55:00.000Z"))?.frequency).toBe(3);
    });

    it("matches twice-weekly on Monday at 10:30 IST", () => {
        expect(getFollowupWindow(new Date("2026-01-05T05:00:00.000Z"))?.frequency).toBe(5);
    });

    it("matches alternate Mondays only on even weeks", () => {
        expect(getFollowupWindow(new Date("2026-01-05T05:05:00.000Z"))?.frequency).toBe(7);
        expect(getFollowupWindow(new Date("2026-01-12T05:05:00.000Z"))).toBeUndefined();
    });

    it("matches the first Monday of the month at 10:40 IST", () => {
        expect(getFollowupWindow(new Date("2026-01-05T05:10:00.000Z"))?.frequency).toBe(8);
        expect(getFollowupWindow(new Date("2026-01-12T05:10:00.000Z"))).toBeUndefined();
    });

    it("does not match on Sunday", () => {
        expect(getFollowupWindow(new Date("2026-01-04T04:40:00.000Z"))).toBeUndefined();
    });
});
