import type { TenderApprovalFormValues, SaveTenderApprovalDto, TenderApproval } from './tenderApproval.types';

export const getInitialValues = (approval?: TenderApproval | null): TenderApprovalFormValues => {
    if (!approval) {
        return {
            tlDecision: '0',
            rfqRequired: undefined,
            quotationFiles: [],
            rfqTo: [],
            processingFeeMode: undefined,
            tenderFeeMode: undefined,
            emdMode: undefined,
            approvePqrSelection: undefined,
            approveFinanceDocSelection: undefined,
            alternativeTechnicalDocs: [],
            alternativeFinancialDocs: [],
            tenderStatus: undefined,
            oemNotAllowed: undefined,
            remarks: undefined,
            incompleteFields: [],
        };
    }

    // Helper to convert null/empty string to undefined for optional fields
    const toOptionalString = (value: string | null | undefined): string | undefined => {
        return value && value.trim() ? value : undefined;
    };

    return {
        tlDecision: String(approval.tlStatus ?? approval.tlDecision ?? '0') as '0' | '1' | '2' | '3',
        rfqRequired: approval.rfqRequired as 'yes' | 'no' | undefined,
        quotationFiles: approval.quotationFiles ?? [],
        rfqTo: approval.rfqTo?.map(id => String(id)) ?? [],
        processingFeeMode: toOptionalString(approval.processingFeeMode),
        tenderFeeMode: toOptionalString(approval.tenderFeeMode),
        emdMode: toOptionalString(approval.emdMode),
        approvePqrSelection: approval.approvePqrSelection as '1' | '2' | undefined,
        approveFinanceDocSelection: approval.approveFinanceDocSelection as '1' | '2' | undefined,
        alternativeTechnicalDocs: approval.alternativeTechnicalDocs ?? [],
        alternativeFinancialDocs: approval.alternativeFinancialDocs ?? [],
        tenderStatus: approval.tenderStatus ? String(approval.tenderStatus) : undefined,
        oemNotAllowed: approval.oemNotAllowed ? String(approval.oemNotAllowed) : undefined,
        remarks: approval.tlRejectionRemarks ?? undefined,
        incompleteFields: approval.incompleteFields ?? [],
    };
};

export const mapFormToPayload = (values: TenderApprovalFormValues): SaveTenderApprovalDto => {
    const basePayload: SaveTenderApprovalDto = {
        tlStatus: values.tlDecision as '0' | '1' | '2' | '3',
    };

    // For Approved status (1)
    if (values.tlDecision === '1') {
        const payload: SaveTenderApprovalDto = {
            ...basePayload,
        };
        if (values.rfqRequired) {
            payload.rfqRequired = values.rfqRequired;
        }
        if (values.quotationFiles && values.quotationFiles.length > 0) {
            payload.quotationFiles = values.quotationFiles;
        }
        if (values.rfqTo && values.rfqTo.length > 0) {
            payload.rfqTo = values.rfqTo.map(id => Number(id));
        }
        if (values.processingFeeMode) {
            payload.processingFeeMode = values.processingFeeMode;
        }
        if (values.tenderFeeMode) {
            payload.tenderFeeMode = values.tenderFeeMode;
        }
        if (values.emdMode) {
            payload.emdMode = values.emdMode;
        }
        if (values.approvePqrSelection) {
            payload.approvePqrSelection = values.approvePqrSelection as '1' | '2';
        }
        if (values.approveFinanceDocSelection) {
            payload.approveFinanceDocSelection = values.approveFinanceDocSelection as '1' | '2';
        }
        if (values.alternativeTechnicalDocs && values.alternativeTechnicalDocs.length > 0) {
            payload.alternativeTechnicalDocs = values.alternativeTechnicalDocs;
        }
        if (values.alternativeFinancialDocs && values.alternativeFinancialDocs.length > 0) {
            payload.alternativeFinancialDocs = values.alternativeFinancialDocs;
        }
        return payload;
    }

    // For Rejected status (2)
    if (values.tlDecision === '2') {
        const payload: SaveTenderApprovalDto = {
            ...basePayload,
        };
        if (values.tenderStatus) {
            payload.tenderStatus = Number(values.tenderStatus);
        }
        if (values.oemNotAllowed) {
            payload.oemNotAllowed = values.oemNotAllowed;
        }
        if (values.remarks) {
            payload.tlRejectionRemarks = values.remarks;
        }
        return payload;
    }

    // For Incomplete status (3)
    if (values.tlDecision === '3') {
        const payload: SaveTenderApprovalDto = {
            ...basePayload,
        };
        if (values.incompleteFields && values.incompleteFields.length > 0) {
            payload.incompleteFields = values.incompleteFields;
        }
        return payload;
    }

    // Default/Pending status (0)
    return basePayload;
};
