import type { TenderApprovalFormValues } from './tenderApproval.types';
import type { SaveTenderApprovalDto, TenderApproval } from '@/types/api.types';

export const getInitialValues = (approval?: TenderApproval | null): TenderApprovalFormValues => {
    if (!approval) {
        return {
            tlDecision: '0',
            rfqTo: [],
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

    return {
        tlDecision: String(approval.tlStatus ?? approval.tlDecision ?? '0') as '0' | '1' | '2' | '3',
        rfqTo: approval.rfqTo?.map(id => String(id)) ?? [],
        tenderFeeMode: approval.tenderFeeMode ?? undefined,
        emdMode: approval.emdMode ?? undefined,
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
        if (values.rfqTo && values.rfqTo.length > 0) {
            payload.rfqTo = values.rfqTo.map(id => Number(id));
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
        // Note: alternativeTechnicalDocs and alternativeFinancialDocs are not yet supported by backend
        // They are kept in the form for validation but not sent in the payload
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
