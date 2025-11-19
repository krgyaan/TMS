export const yesNoOptions = [
    { value: 'YES', label: 'Yes' },
    { value: 'NO', label: 'No' },
];

export const emdRequiredOptions = [
    { value: 'YES', label: 'Yes' },
    { value: 'NO', label: 'No' },
    { value: 'EXEMPT', label: 'Exempt' },
];

export const paymentModeOptions = [
    { value: 'DD', label: 'DD (Demand Draft)' },
    { value: 'POP', label: 'POP' },
    { value: 'BT', label: 'BT (Bank Transfer)' },
    { value: 'FDR', label: 'FDR' },
    { value: 'PBG', label: 'PBG' },
    { value: 'SB', label: 'SB' },
    { value: 'ONLINE', label: 'Online' },
];

export const paymentTermsOptions = Array.from({ length: 21 }, (_, i) => ({
    value: i * 5,
    label: `${i * 5}%`,
}));

export const bidValidityOptions = Array.from({ length: 367 }, (_, i) => ({
    value: i,
    label: `${i} ${i === 1 ? 'day' : 'days'}`,
}));

export const commercialEvaluationOptions = [
    { value: 'ITEM_WISE_GST_INCLUSIVE', label: 'Item Wise GST Inclusive' },
    { value: 'ITEM_WISE_PRE_GST', label: 'Item Wise Pre GST' },
    { value: 'OVERALL_GST_INCLUSIVE', label: 'Overall GST Inclusive' },
    { value: 'OVERALL_PRE_GST', label: 'Overall Pre GST' },
];

export const mafRequiredOptions = [
    { value: 'YES_GENERAL', label: 'Yes - General' },
    { value: 'YES_PROJECT_SPECIFIC', label: 'Yes - Project Specific' },
    { value: 'NO', label: 'No' },
];

export const pbgFormOptions = [
    { value: 'DD_DEDUCTION', label: 'DD/Deduction' },
    { value: 'FDR', label: 'FDR' },
    { value: 'PBG', label: 'PBG' },
    { value: 'SB', label: 'SB' },
    { value: 'NA', label: 'NA' },
];

export const sdFormOptions = [
    { value: 'DD_DEDUCTION', label: 'DD/Deduction' },
    { value: 'FDR', label: 'FDR' },
    { value: 'PBG', label: 'PBG' },
    { value: 'SB', label: 'SB' },
    { value: 'NA', label: 'NA' },
];

export const pbgDurationOptions = Array.from({ length: 121 }, (_, i) => ({
    value: i,
    label: `${i} ${i === 1 ? 'month' : 'months'}`,
}));

export const ldPerWeekOptions = Array.from({ length: 11 }, (_, i) => ({
    value: i * 0.5,
    label: `${(i * 0.5).toFixed(1)}%`,
}));

export const maxLdOptions = Array.from({ length: 21 }, (_, i) => ({
    value: i,
    label: `${i}%`,
}));

export const financialCriteriaOptions = [
    { value: 'NOT_APPLICABLE', label: 'Not Applicable' },
    { value: 'POSITIVE', label: 'Positive' },
    { value: 'AMOUNT', label: 'Amount' },
];

export const rejectionReasonOptions = [
    { value: '9', label: 'Status 9' },
    { value: '10', label: 'Status 10' },
    { value: '11', label: 'Status 11' },
    { value: '12', label: 'Status 12' },
    { value: '13', label: 'Status 13' },
    { value: '14', label: 'Status 14' },
    { value: '15', label: 'Status 15' },
    { value: '29', label: 'Status 29' },
    { value: '30', label: 'Status 30' },
    { value: '35', label: 'Status 35' },
    { value: '36', label: 'Status 36' },
];

// Dummy Master Documents (replace later with API call)
export const dummyTechnicalDocuments = [
    { value: '1', label: 'Technical Specification Document' },
    { value: '2', label: 'Product Catalog' },
    { value: '3', label: 'Test Certificates' },
    { value: '4', label: 'Quality Certifications (ISO, etc.)' },
    { value: '5', label: 'OEM Authorization' },
    { value: '6', label: 'Similar Work Experience Certificates' },
    { value: '7', label: 'Installation Manual' },
];

export const dummyFinancialDocuments = [
    { value: '1', label: 'Balance Sheet (Last 3 Years)' },
    { value: '2', label: 'Profit & Loss Statement' },
    { value: '3', label: 'Income Tax Returns' },
    { value: '4', label: 'GST Registration Certificate' },
    { value: '5', label: 'PAN Card' },
    { value: '6', label: 'Audited Financial Statements' },
    { value: '7', label: 'Bank Solvency Certificate' },
    { value: '8', label: 'Working Capital Certificate' },
];

export const dummyPqcDocuments = [
    { value: '1', label: 'Company Registration Certificate' },
    { value: '2', label: 'GST Certificate' },
    { value: '3', label: 'PAN Card' },
    { value: '4', label: 'Partnership Deed / MOA & AOA' },
    { value: '5', label: 'Authorized Signatory List' },
    { value: '6', label: 'Power of Attorney' },
    { value: '7', label: 'MSME Certificate (if applicable)' },
];
