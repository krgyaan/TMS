function mapInstrumentTypeToMode(instrumentType: string | null): string | undefined {
    if (!instrumentType) return undefined;
    const mapping: Record<string, string> = {
        'Bank Transfer': 'BANK_TRANSFER',
        'Portal Payment': 'PORTAL',
        'DD': 'DD',
        'FDR': 'FDR',
        'BG': 'BG',
        'Cheque': 'CHEQUE',
    };
    return mapping[instrumentType];
}

export function buildEmdEditFormData(editData: any) {
    if (!editData) {
        return { formData: undefined, requestIds: undefined };
    }

    const mode = mapInstrumentTypeToMode(editData.mode);

    let purposeKey = 'EMD';
    if (editData.purpose === 'Tender Fee' || editData.purpose === 'TENDER_FEES') {
        purposeKey = 'TENDER_FEES';
    } else if (editData.purpose === 'Processing Fee' || editData.purpose === 'PROCESSING_FEES') {
        purposeKey = 'PROCESSING_FEES';
    }

    const formData: any = {
        requestedBy: editData.requestedBy,
        tenderNo: editData.tenderNo,
        tenderName: editData.tenderName,
        tenderDueDate: editData.tenderDueDate,
        EMD: { mode: undefined, details: {} },
        TENDER_FEES: { mode: undefined, details: {} },
        PROCESSING_FEES: { mode: undefined, details: {} },
        [purposeKey]: {
            mode,
            details: editData,
        },
    };

    const requestIds: any = {
        emd: purposeKey === 'EMD' ? editData.id : undefined,
        tenderFee: purposeKey === 'TENDER_FEES' ? editData.id : undefined,
        processingFee: purposeKey === 'PROCESSING_FEES' ? editData.id : undefined,
    };

    return { formData, requestIds };
}
