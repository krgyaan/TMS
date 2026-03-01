export type FollowupWindow = {
    hour: number;
    minute: number;
    days: number[]; // 0=Sun ... 6=Sat
    frequency: number;
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
];
