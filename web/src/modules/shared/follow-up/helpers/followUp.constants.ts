export type SelectOption = { value: string; label: string };

export const AREA_OPTIONS: SelectOption[] = [
    { value: "PG Personal", label: "PG Personal" },
    { value: "Accounts", label: "Accounts" },
    { value: "AC Team", label: "AC Team" },
    { value: "DC team", label: "DC team" },
];

export const FREQUENCY_LABELS: Record<number, string> = {
    1: "Daily",
    2: "Alternate Days",
    3: "Twice a day",
    4: "Weekly",
    5: "Twice a Week",
    6: "Stop",
    7: "Once in 15 Days (Alternate Mondays)",
    8: "Once a Month (First Monday)",
};

export const FREQUENCY_OPTIONS: SelectOption[] = Object.entries(FREQUENCY_LABELS)
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => {
        if (Number(a.value) === 6) return 1;
        if (Number(b.value) === 6) return -1;
        return Number(a.value) - Number(b.value);
    });

export const STOP_REASON_LABELS: Record<number, string> = {
    1: "Party Angry / Not Interested",
    2: "Objective Achieved",
    3: "Not Reachable",
    4: "Other",
};

export const STOP_REASON_OPTIONS: SelectOption[] = Object.entries(STOP_REASON_LABELS).map(([value, label]) => ({
    value,
    label,
}));

export const FOLLOW_UP_TABS = ["ongoing", "achieved", "angry", "future"] as const;
export type FollowUpTab = (typeof FOLLOW_UP_TABS)[number];
