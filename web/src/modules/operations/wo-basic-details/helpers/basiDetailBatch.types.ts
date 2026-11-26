export type BasicDetailOrderType = "single" | "repeat" | "multiple";

export type ContactRow = {
    name: string;
    designation: string;
    phones: string[];
    email: string;
    organization: string;
    departments: string;
};

export type OrderRow = {
    woNumber: string;
    woDate: Date | null;
    woValuePreGst: string;
    woValueGstAmt: string;
    orderNature: "" | "supply" | "service" | "sitc";
    poReceivedStatus: "" | "received" | "not_received" | "not_applicable";
    sapPoUpload: string[];
    woDraft: string[];
    budgetPreGst: string;
    receiptPreGst: string;
    finalPrice: string;
    budgetSupply: string;
    budgetService: string;
    budgetFreight: string;
    budgetAdmin: string;
    budgetBuybackSale: string;
    requestGemCharges: "true" | "false" | "";
    gemChargesAmount: string;
    gemChargesPortalLink: string;
    gemChargesInvoice: string[];
    contacts: ContactRow[];
};

export type OrderDefaults = {
    budgetPreGst?: string;
    receiptPreGst?: string;
    finalPrice?: string;
    requestGemCharges?: "true" | "false";
};
