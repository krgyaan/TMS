export const PAYMENT_AGAINST_LABELS: Record<string, string> = {
    upload_invoice: "Upload Invoice",
    new_pi: "New PI",
    po: "PO",
    vwo: "VWO",
    others: "Imprest",
    imprest: "Imprest",
};

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    pending: { label: "Pending", color: "text-yellow-600 bg-yellow-50" },
    maker_done: { label: "Maker Done", color: "text-blue-600 bg-blue-50" },
    payment_done: { label: "Payment Done", color: "text-green-600 bg-green-50" },
    rejected: { label: "Rejected", color: "text-red-600 bg-red-50" },
};