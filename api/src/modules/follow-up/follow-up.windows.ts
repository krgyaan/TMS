export type FollowupWindow = {
    hour: number;
    minute: number;
    days: number[]; // 0=Sun ... 6=Sat
    frequency: number;
    customCheck?: (date: Date) => boolean;
};

export const FOLLOWUP_WINDOWS: FollowupWindow[] = [
    // app:followup-mail — Daily (Mon–Sat) at 10:10
    // frequency: 1 → Daily
    { hour: 10, minute: 10, days: [1, 2, 3, 4, 5, 6], frequency: 1 },

    // app:followup-mail2 — Alternate Days (Mon–Sat) at 10:15
    // frequency: 2 → Alternate Days (state-based, not calendar-date-based)
    { hour: 10, minute: 15, days: [1, 2, 3, 4, 5, 6], frequency: 2 },

    // app:followup-mail3 — Weekly (Every Monday) at 10:20
    // frequency: 4 → Weekly (every Mon)
    { hour: 10, minute: 20, days: [1], frequency: 4 },

    // app:followup-mail4 — Twice a Day (Mon–Sat) at 10:25
    // frequency: 3 → 2 times a day
    { hour: 10, minute: 25, days: [1, 2, 3, 4, 5, 6], frequency: 3 },

    // app:followup-mail4 — Twice a Day (Mon–Sat) at 16:25
    // frequency: 3 → 2 times a day
    { hour: 16, minute: 25, days: [1, 2, 3, 4, 5, 6], frequency: 3 },

    // app:followup-mail5 — Twice a Week (Mon & Thu) at 10:30
    // frequency: 5 → Twice a week (every Mon & Thu)
    { hour: 10, minute: 30, days: [1, 4], frequency: 5 },

    // app:followup-mail6 — Alternate Mondays at 10:35
    // frequency: 7 → Once in 15 Days (Alternate Mondays)
    { hour: 10, minute: 35, days: [1], frequency: 7, customCheck: (date: Date) => {
            const ref = new Date(2026, 0, 5); // Monday, Jan 5, 2026
            ref.setHours(0, 0, 0, 0);
            const curr = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            curr.setHours(0, 0, 0, 0);
            const diffWeeks = Math.round((curr.getTime() - ref.getTime()) / (7 * 24 * 60 * 60 * 1000));
            return diffWeeks % 2 === 0;
        },
    },

    // app:followup-mail7 — First Monday of the Month at 10:40
    // frequency: 8 → Once a Month (First Monday of the Month)
    {
        hour: 10, minute: 40, days: [1], frequency: 8, customCheck: (date: Date) => {
            return date.getDate() <= 7;
        },
    },
];
