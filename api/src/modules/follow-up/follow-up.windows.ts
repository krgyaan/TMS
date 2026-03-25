export type FollowupWindow = {
    hour: number;
    minute: number;
    days: number[]; // 0=Sun ... 6=Sat
    frequency: number;
};

export const FOLLOWUP_WINDOWS: FollowupWindow[] = [
    // app:followup-mail — Daily (Mon–Sat) at 09:45
    { hour: 9, minute: 45, days: [1, 2, 3, 4, 5, 6], frequency: 1 },

    // app:followup-mail2 — Alternate Days (Mon–Sat) at 09:45
    { hour: 9, minute: 45, days: [1, 2, 3, 4, 5, 6], frequency: 2 },

    // app:followup-mail3 — Weekly (Every Monday) at 09:45
    { hour: 9, minute: 45, days: [1], frequency: 4 },

    // app:followup-mail4 — Twice a Day (Mon–Sat) at 09:45
    { hour: 9, minute: 45, days: [1, 2, 3, 4, 5, 6], frequency: 3 },

    // app:followup-mail4 — Twice a Day (Mon–Sat) at 09:45 (was 16:25)
    { hour: 9, minute: 45, days: [1, 2, 3, 4, 5, 6], frequency: 3 },

    // app:followup-mail5 — Twice a Week (Mon & Thu) at 09:45
    { hour: 9, minute: 45, days: [1, 4], frequency: 5 },
];
