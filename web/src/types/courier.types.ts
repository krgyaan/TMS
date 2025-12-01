export type CourierDoc = {
    url: string;
    name: string;
    type: "image" | "file";
};

export type Courier = {
    id: number;
    user_id: number;
    to_org: string;
    to_name: string;
    to_addr: string;
    to_pin: string;
    to_mobile: string;
    emp_from: number;
    del_date: string;
    urgency: number;
    courier_provider: string | null;
    pickup_date: string | null;
    docket_no: string | null;
    delivery_date: string | null;
    delivery_pod: string | null;
    within_time: boolean | null;
    courier_docs: CourierDoc[] | null;
    status: number;
    tracking_number: string | null;
    created_at: string;
    updated_at: string;
};

export type CreateCourierInput = {
    to_org: string;
    to_name: string;
    to_addr: string;
    to_pin: string;
    to_mobile: string;
    emp_from: number;
    del_date: string;
    urgency: number;
};

export type UpdateCourierInput = Partial<CreateCourierInput>;

export type UpdateStatusInput = {
    status: number;
    delivery_date?: string;
    within_time?: boolean;
};

export type UpdateDispatchInput = {
    courier_provider: string;
    docket_no: string;
    pickup_date: string;
};

export type CourierDashboardData = {
    pending: Courier[];
    dispatched: Courier[];
    not_delivered: Courier[];
    delivered: Courier[];
    rejected: Courier[];
    counts: {
        pending: number;
        dispatched: number;
        not_delivered: number;
        delivered: number;
        rejected: number;
    };
};

// Status constants (must match backend)
export const COURIER_STATUS = {
    PENDING: 0,
    DISPATCHED: 1,
    NOT_DELIVERED: 2,
    DELIVERED: 3,
    REJECTED: 4,
} as const;

export const COURIER_STATUS_LABELS: Record<number, string> = {
    [COURIER_STATUS.PENDING]: "Pending",
    [COURIER_STATUS.DISPATCHED]: "Dispatched",
    [COURIER_STATUS.NOT_DELIVERED]: "Not Delivered",
    [COURIER_STATUS.DELIVERED]: "Delivered",
    [COURIER_STATUS.REJECTED]: "Rejected",
};
