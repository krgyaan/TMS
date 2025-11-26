export const MODES = {
    DD: '1',
    FDR: '2',
    CHEQUE: '3',
    BG: '4',
    BANK_TRANSFER: '5',
    PORTAL: '6',
};

export const MODE_LABELS = {
    '1': "Demand Draft",
    '2': "Fixed Deposit Receipt",
    '3': "Cheque",
    '4': "Bank Guarantee",
    '5': "Bank Transfer",
    '6': "Payment on Portal",
};

export const INSTRUMENT_TYPE = [
    { value: "0", label: "NA" },
    { value: "1", label: "Demand Draft" },
    { value: "2", label: "Fixed Deposit Receipt" },
    { value: "3", label: "Cheque" },
    { value: "4", label: "Bank Guarantee" },
    { value: "5", label: "Bank Transfer" },
    { value: "6", label: "Payment on Portal" },
];

export const PURPOSE_OPTIONS = [
    { value: "EMD", label: "EMD" },
    { value: "TENDER_FEES", label: "Tender Fees" },
    { value: "SECURITY_DEPOSIT", label: "Security Deposit" },
    { value: "OTHER_PAYMENT", label: "Other Payment" },
    { value: "OTHER_SECURITY", label: "Other Security" },
];

export const BG_PURPOSE_OPTIONS = [
    { value: "ADVANCE_PAYMENT", label: "Advance Payment" },
    { value: "SECURITY_BOND_DEPOSIT", label: "Security Bond/Deposit" },
    { value: "BID_BOND", label: "Bid Bond" },
    { value: "PERFORMANCE", label: "Performance" },
    { value: "FINANCIAL", label: "Financial" },
    { value: "COUNTER_GUARANTEE", label: "Counter Guarantee" },
];

export const DELIVERY_OPTIONS = [
    { value: "TENDER_DUE", label: "Tender Due Date" },
    { value: "24", label: "24 Hours" },
    { value: "48", label: "48 Hours" },
    { value: "72", label: "72 Hours" },
    { value: "96", label: "96 Hours" },
    { value: "120", label: "120 Hours" },
];

export const BANKS = [
    { value: "SBI", label: "State Bank of India" },
    { value: "HDFC_0026", label: "HDFC Bank" },
    { value: "ICICI", label: "ICICI Bank" },
    { value: "YESBANK_2011", label: "Yes Bank 2011" },
    { value: "YESBANK_0771", label: "Yes Bank 0771" },
    { value: "PNB_6011", label: "Punjab National Bank" },
    { value: "BGLIMIT_0771", label: "BG Limit" },
];

export const BANK_LABELS = {
    'SBI': "State Bank of India",
    'HDFC_0026': "HDFC Bank",
    'ICICI': "ICICI Bank",
    'YESBANK_2011': "Yes Bank 2011",
    'YESBANK_0771': "Yes Bank 0771",
    'PNB_6011': "Punjab National Bank",
    'BGLIMIT_0771': "BG Limit",
};

export const BG_STATUS = [
    { value: "1", label: "Accounts Form 1 - Request to Bank" },
    { value: "2", label: "Accounts Form 2 - After BG Creation" },
    { value: "3", label: "Accounts Form 3 - Capture FDR Details" },
    { value: "4", label: "Initiate Followup" },
    { value: "5", label: "Request Extension" },
    { value: "6", label: "Returned via courier" },
    { value: "7", label: "Request Cancellation" },
    { value: "8", label: "BG Cancellation Confirmation" },
    { value: "9", label: "FDR Cancellation Confirmation" },
];

export const DD_STATUS = [
    { value: "1", label: "Accounts Form (DD)" },
    { value: "2", label: "Initiate Followup" },
    { value: "3", label: "Returned via courier" },
    { value: "4", label: "Returned via Bank Transfer" },
    { value: "5", label: "Settled with Project Account" },
    { value: "6", label: "Send DD Cancellation Request" },
    { value: "7", label: "DD cancelled at Branch" },
];
