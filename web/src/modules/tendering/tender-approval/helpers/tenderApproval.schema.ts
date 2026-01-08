import { z } from 'zod';

export const TenderApprovalFormSchema = z.object({
    tlDecision: z.enum(['0', '1', '2', '3']),

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
    oemNotAllowed: z.string().optional(),
    remarks: z.string().max(1000).optional(),

    // Incomplete Fields
    incompleteFields: z.array(z.object({
        fieldName: z.string(),
        comment: z.string(),
    })).optional(),
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
});
