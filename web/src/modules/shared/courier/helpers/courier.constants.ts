export const COURIER_STATUS = {
    PENDING: 0,
    IN_TRANSIT: 1,
    DISPATCHED: 2,
    NOT_DELIVERED: 3,
    DELIVERED: 4,
    REJECTED: 5,
} as const;

export const COURIER_STATUS_LABELS: Record<number, string> = {
    [COURIER_STATUS.PENDING]: "Pending",
    [COURIER_STATUS.IN_TRANSIT]: "In Transit",
    [COURIER_STATUS.DISPATCHED]: "Out for delivery",
    [COURIER_STATUS.NOT_DELIVERED]: "Address incorrect / Not delivered / Returned",
    [COURIER_STATUS.DELIVERED]: "Delivered",
    [COURIER_STATUS.REJECTED]: "Rejected",
};

export const COURIER_STATUS_OPTIONS = Object.entries(COURIER_STATUS).map(([, value]) => ({
    value: String(value),
    label: COURIER_STATUS_LABELS[value] ?? `Status ${value}`,
}));

export const COURIER_STATUS_BADGE: Record<number, "outline" | "secondary" | "success" | "destructive" | "default" | null | undefined> = {
    [COURIER_STATUS.PENDING]: 'outline',
    [COURIER_STATUS.IN_TRANSIT]: 'outline',
    [COURIER_STATUS.DISPATCHED]: 'outline',
    [COURIER_STATUS.NOT_DELIVERED]: 'secondary',
    [COURIER_STATUS.DELIVERED]: 'success',
    [COURIER_STATUS.REJECTED]: 'destructive',
};

export const COURIER_TABS = [
    { key: "pending", label: "Pending" },
    { key: "dispatched", label: "Dispatched" },
    { key: "not_delivered", label: "Not Delivered" },
    { key: "delivered", label: "Delivered" },
    { key: "rejected", label: "Rejected" },
] as const;
