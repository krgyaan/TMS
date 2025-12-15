// -------------------------------
// Shared Types
// -------------------------------

export type CourierDoc = {
    url: string;
    name: string;
    type: "image" | "file";
};

// -------------------------------
// Courier Base Type (matches backend)
// -------------------------------

export type Courier = {
    id: number;
    userId: number;
    toOrg: string;
    toName: string;
    toAddr: string;
    toPin: string;
    toMobile: string;
    empFrom: number | null; // allow null because relation may be missing
    delDate: string;
    urgency: number;

    courierProvider: string | null;
    pickupDate: string | null;
    docketNo: string | null;

    deliveryDate: string | null;
    deliveryPod: string | null;
    withinTime: boolean | null;

    courierDocs: CourierDoc[] | null;

    status: number;
    trackingNumber: string | null;

    createdAt: string;
    updatedAt: string;

    // Optional relational fields (automatically null if missing)
    empFromUser?: UserMini | null;
    createdByUser?: UserMini | null;
};

// For nested relations (sender or creator)
export type UserMini = {
    id: number;
    name: string;
    email: string;
};

// -------------------------------
// Create / Update Inputs
// -------------------------------

export type CreateCourierInput = {
    toOrg: string;
    toName: string;
    toAddr: string;
    toPin: string;
    toMobile: string;
    empFrom: number;
    delDate: string;
    urgency: number;
};

export type UpdateCourierInput = Partial<CreateCourierInput>;

export type UpdateStatusInput = {
    status: number;
    deliveryDate?: string;
    withinTime?: boolean;
};

export type CreateDispatchInput = {
    courierProvider: string;
    docketNo: string;
    pickupDate: string;
    docketSlip?: File;
};

export type UpdateDispatchInput = {
    courierProvider: string;
    docketNo: string;
    pickupDate: string;
};

// -------------------------------
// Dashboard API Output
// -------------------------------

export type CourierDashboardData = {
    pending: Courier[];
    dispatched: Courier[];
    notDelivered: Courier[];
    delivered: Courier[];
    rejected: Courier[];
    counts: {
        pending: number;
        dispatched: number;
        notDelivered: number;
        delivered: number;
        rejected: number;
    };
};

// -------------------------------
// Courier Details (Single View)
// -------------------------------

export type CourierDetails = Courier & {
    createdByName: string | null;
    createdByEmail: string | null;
    sender: UserMini | null;
};

// -------------------------------
// Status Constants
// -------------------------------

export const COURIER_STATUS = {
    PENDING: 0,
    IN_TRANSIT: 1,
    DISPATCHED: 2,
    NOT_DELIVERED: 3,
    DELIVERED: 4,
    REJECTED: 5,
} as const;

export const COURIER_STATUS_LABELS: Record<number, string> = {
    [COURIER_STATUS.IN_TRANSIT]: "In Transit",
    [COURIER_STATUS.DISPATCHED]: "Out for delivery",
    [COURIER_STATUS.NOT_DELIVERED]: "Address incorrect / Not delivered / Returned",
    [COURIER_STATUS.DELIVERED]: "Delivered",
    [COURIER_STATUS.REJECTED]: "Rejected",
};
