import { z } from 'zod';

export interface InfoSheetCondition {
    processingFeeRequired: 'YES' | 'NO' | null;
    processingFeeAmount: number | string | null;
    processingFeeMode: string[] | null;
    tenderFeeRequired: 'YES' | 'NO' | null;
    tenderFeeAmount: number | string | null;
    tenderFeeMode: string[] | null;
    emdRequired: 'YES' | 'NO' | 'EXEMPT' | null;
    emdAmount: number | string | null;
    emdMode: string[] | null;
}

export const TenderApprovalFormSchema = z.object({
    tlDecision: z.enum(['0', '1', '2', '3']),

    // RFQ Required (when approved)
    rfqRequired: z.enum(['yes', 'no']).optional(),
    // quotationFiles: z.array(z.string()).max(5).optional(),

    // Bidding Details (when approved)
    rfqTo: z.array(z.string()).optional(),
    processingFeeMode: z.string().optional(),
    tenderFeeMode: z.string().optional(),
    emdMode: z.string().optional(),

    // Document Approval
    approvePqrSelection: z.enum(['1', '2']).optional(),
    approveFinanceDocSelection: z.enum(['1', '2']).optional(),

    // Alternative documents when rejected
    alternativeTechnicalDocs: z.array(z.string()).optional(),
    alternativeFinancialDocs: z.array(z.string()).optional(),

    // Rejection Details
    tenderStatus: z.string().optional(),
    tlApprovalRemarks: z.string().max(2000).optional(),
    tlRejectionRemarks: z.string().max(2000).optional(),
    tlIncompleteRemarks: z.string().max(2000).optional(),
    oemNotAllowed: z.array(z.string()).optional(),

    // Incomplete Fields
    incompleteFields: z.array(z.object({
        fieldName: z.string(),
        comment: z.string().min(1, "Comment is required"),
    })).optional(),

    // InfoSheet context fields (for conditional validation - not submitted to API)
    processingFeeRequired: z.enum(['YES', 'NO']).nullable().optional(),
    processingFeeAmount: z.number().optional(),
    processingFeeModes: z.array(z.string()).optional(),
    tenderFeeRequired: z.enum(['YES', 'NO']).nullable().optional(),
    tenderFeeAmount: z.number().optional(),
    tenderFeeModes: z.array(z.string()).optional(),
    emdRequired: z.enum(['YES', 'NO', 'EXEMPT']).nullable().optional(),
    emdAmount: z.number().optional(),
    emdModes: z.array(z.string()).optional(),
}).refine((data) => {
    // If incomplete status, must have at least 1 incomplete field
    if (data.tlDecision === '3') {
        return Array.isArray(data.incompleteFields) && data.incompleteFields.length > 0;
    }
    return true;
}, {
    message: "Please select at least one field to mark as incomplete",
    path: ["incompleteFields"],
}).refine((data) => {
    // If PQR rejected, must select alternative documents
    if (data.tlDecision === '1' && data.approvePqrSelection === '2') {
        return Array.isArray(data.alternativeTechnicalDocs) && data.alternativeTechnicalDocs.length > 0;
    }
    return true;
}, {
    message: "Please select alternative technical documents",
    path: ["alternativeTechnicalDocs"],
}).refine((data) => {
    // If Finance docs rejected, must select alternative documents
    if (data.tlDecision === '1' && data.approveFinanceDocSelection === '2') {
        return Array.isArray(data.alternativeFinancialDocs) && data.alternativeFinancialDocs.length > 0;
    }
    return true;
}, {
    message: "Please select alternative financial documents",
    path: ["alternativeFinancialDocs"],
}).refine((data) => {
    // If approved and RFQ required is yes, must select at least one vendor
    if (data.tlDecision === '1' && data.rfqRequired === 'yes') {
        return Array.isArray(data.rfqTo) && data.rfqTo.length > 0;
    }
    return true;
}, {
    message: "Please select at least one vendor for RFQ",
    path: ["rfqTo"],
}).superRefine((data, ctx) => {
    // Conditional validation for Processing Fee Mode
    if (data.tlDecision === '1') {
        const amount = Number(data.processingFeeAmount) || 0;
        const hasAmount = amount > 0;
        const hasModes = data.processingFeeModes && data.processingFeeModes.length > 0;
        const required = data.processingFeeRequired === 'YES' && hasAmount && hasModes;

        if (required && !data.processingFeeMode) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Processing Fee Mode is required",
                path: ["processingFeeMode"],
            });
        }
    }
}).superRefine((data, ctx) => {
    // Conditional validation for Tender Fee Mode
    if (data.tlDecision === '1') {
        const amount = Number(data.tenderFeeAmount) || 0;
        const hasAmount = amount > 0;
        const hasModes = data.tenderFeeModes && data.tenderFeeModes.length > 0;
        const required = data.tenderFeeRequired === 'YES' && hasAmount && hasModes;

        if (required && !data.tenderFeeMode) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Tender Fee Mode is required",
                path: ["tenderFeeMode"],
            });
        }
    }
}).superRefine((data, ctx) => {
    // Conditional validation for EMD Mode
    if (data.tlDecision === '1') {
        const isExempt = data.emdRequired === 'EXEMPT';
        const amount = Number(data.emdAmount) || 0;
        const hasAmount = amount > 0;
        const hasModes = data.emdModes && data.emdModes.length > 0;
        const required = !isExempt && data.emdRequired === 'YES' && hasAmount && hasModes;

        if (required && !data.emdMode) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "EMD Mode is required",
                path: ["emdMode"],
            });
        }
    }
});
