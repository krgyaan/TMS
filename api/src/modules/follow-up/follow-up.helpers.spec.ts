import { isAlternateDayDue, isMailBodyEmpty } from "./follow-up.helpers";

describe("isMailBodyEmpty", () => {
    it("treats null, undefined and whitespace as empty", () => {
        expect(isMailBodyEmpty(null)).toBe(true);
        expect(isMailBodyEmpty(undefined)).toBe(true);
        expect(isMailBodyEmpty("")).toBe(true);
        expect(isMailBodyEmpty("   ")).toBe(true);
    });

    it("treats HTML-only bodies as empty", () => {
        expect(isMailBodyEmpty("<p></p>")).toBe(true);
        expect(isMailBodyEmpty("<p><br></p>")).toBe(true);
        expect(isMailBodyEmpty("<div>&nbsp;</div>")).toBe(true);
        expect(isMailBodyEmpty("<p>&#160;</p>")).toBe(true);
    });

    it("treats bodies with text as non-empty", () => {
        expect(isMailBodyEmpty("<p>Hello</p>")).toBe(false);
        expect(isMailBodyEmpty("Please find the details below.")).toBe(false);
    });
});

describe("isAlternateDayDue", () => {
    it("allows the first send when no reminder has been sent", () => {
        expect(isAlternateDayDue({ startFrom: "2026-01-05", lastReminderSentAt: null })).toBe(true);
    });

    it("blocks the day after a send", () => {
        expect(
            isAlternateDayDue(
                { startFrom: "2026-01-05", lastReminderSentAt: new Date("2026-01-05T04:45:00.000Z") },
                new Date("2026-01-06T04:45:00.000Z")
            )
        ).toBe(false);
    });

    it("allows a send two IST days later", () => {
        expect(
            isAlternateDayDue(
                { startFrom: "2026-01-05", lastReminderSentAt: new Date("2026-01-05T04:45:00.000Z") },
                new Date("2026-01-07T04:45:00.000Z")
            )
        ).toBe(true);
    });

    it("honours an explicitly advanced next follow-up date", () => {
        expect(
            isAlternateDayDue(
                { startFrom: "2026-01-08", lastReminderSentAt: new Date("2026-01-05T04:45:00.000Z") },
                new Date("2026-01-06T04:45:00.000Z")
            )
        ).toBe(true);
    });
});
