// -------------------------------
// Shared Types
// -------------------------------

export type CourierDoc = {
    url: string;
    name: string;
    type: "image" | "file";
};

export type UserMini = {
    id: number;
    name: string;
    email: string;
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

    empFrom: number | null;
    delDate: string;
    urgency: number;

    courierProvider: string | null;
    pickupDate: string | null;
    docketNo: string | null;

    docketSlip: string | null;

    deliveryDate: string | null;
    deliveryPod: string | null;
    withinTime: boolean | null;

    courierDocs: string[] | null;

    status: number;
    trackingNumber: string | null;

    notes?: string | null;

    createdAt: string;
    updatedAt: string;

    // Relations
    empFromUser?: UserMini | null;
    createdByUser?: UserMini | null;
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
    podDoc?: string;
};

export type CreateDispatchInput = {
    courierProvider: string;
    docketNo: string;
    pickupDate: string;
    docketSlip?: string;
};

export type UpdateDispatchInput = CreateDispatchInput;

// -------------------------------
// Dashboard
// -------------------------------

export type CourierTab = "pending" | "dispatched" | "not_delivered" | "delivered" | "rejected";

export type CourierDashboardQueryParams = {
    tab?: CourierTab;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
};

export type CourierDashboardRow = Courier & {
    empFromUser?: UserMini | null;
};

export type CourierDashboardCounts = {
    pending: number;
    dispatched: number;
    not_delivered: number;
    delivered: number;
    rejected: number;
    total: number;
};

// -------------------------------
// Courier Details (Single View)
// -------------------------------

export type CourierDetails = Courier & {
    createdByName: string | null;
    createdByEmail: string | null;
    sender: UserMini | null;
};
