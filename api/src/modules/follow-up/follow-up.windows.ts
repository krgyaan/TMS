export type FollowupWindow = {
    hour: number;
    minute: number;
    days: number[]; // 0=Sun ... 6=Sat
    frequency: number;
};

export const FOLLOWUP_WINDOWS: FollowupWindow[] = [
    // Daily — 10:10 Mon–Sat
    { hour: 10, minute: 10, days: [1, 2, 3, 4, 5, 6], frequency: 1 },
    // Alternate — 10:15 Mon–Sat
    { hour: 10, minute: 15, days: [1, 2, 3, 4, 5, 6], frequency: 2 },
    // Weekly — Monday 10:20
    { hour: 10, minute: 20, days: [1], frequency: 3 },
    // Bi-Weekly — 10:25 & 16:25 Mon–Sat
    { hour: 10, minute: 25, days: [1, 2, 3, 4, 5, 6], frequency: 4 },
    { hour: 16, minute: 25, days: [1, 2, 3, 4, 5, 6], frequency: 4 },
    // Monthly-like — Mon & Thu 10:30
    { hour: 10, minute: 30, days: [1, 4], frequency: 5 },
    // Daily — 10:10 Mon–Sat
    { hour: 10, minute: 10, days: [1, 2, 3, 4, 5, 6], frequency: 1 },
    // Alternate — 10:15 Mon–Sat
    { hour: 10, minute: 15, days: [1, 2, 3, 4, 5, 6], frequency: 2 },
    // Weekly — Monday 10:20
    { hour: 10, minute: 20, days: [1], frequency: 3 },
    // Bi-Weekly — 10:25 & 16:25 Mon–Sat
    { hour: 10, minute: 25, days: [1, 2, 3, 4, 5, 6], frequency: 4 },
    { hour: 16, minute: 25, days: [1, 2, 3, 4, 5, 6], frequency: 4 },
    // Monthly-like — Mon & Thu 10:30
    { hour: 10, minute: 30, days: [1, 4], frequency: 5 },
];
