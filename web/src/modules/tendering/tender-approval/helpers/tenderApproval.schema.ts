import { z } from 'zod';

export const TenderApprovalFormSchema = z.object({
    tlDecision: z.enum(['0', '1', '2', '3']),

    // RFQ Required (when approved)
    rfqRequired: z.enum(['yes', 'no']).optional(),
    quotationFiles: z.array(z.string()).max(5).optional(),

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
}).refine((data) => {
    // If approved and RFQ required is yes, must select at least one vendor
    if (data.tlDecision === '1' && data.rfqRequired === 'yes') {
        return Array.isArray(data.rfqTo) && data.rfqTo.length > 0;
    }
    return true;
}, {
    message: "Please select at least one vendor for RFQ",
    path: ["rfqTo"],
}).refine((data) => {
    // If approved and RFQ required is no, must upload at least one quotation file
    if (data.tlDecision === '1' && data.rfqRequired === 'no') {
        return Array.isArray(data.quotationFiles) && data.quotationFiles.length > 0;
    }
    return true;
}, {
    message: "Please upload at least one quotation file",
    path: ["quotationFiles"],
});
