import type { UseFormReturn } from 'react-hook-form';
import type { TenderInfoSheetFormValues } from './tenderInfoSheet.types';

export interface ExtractedField<T = unknown> {
    value: T;
    confidence: 'high' | 'medium' | 'low' | 'not_applicable' | string;
    source?: string | null;
}

export interface PopulateResult {
    populatedCount: number;
    populatedKeys: string[];
}

import type { FieldIndicator } from '@/components/form/AiIndicatorsContext';
export type { FieldIndicator };

// Maps VolksAI extraction field keys to corresponding TenderInfoSheet form field keys
export const EXTRACTION_TO_FORM_FIELD_MAP: Record<string, keyof TenderInfoSheetFormValues> = {
    emdRequired: 'emdRequired',
    emdAmount: 'emdAmount',
    emdModes: 'emdModes',
    tenderFeeRequired: 'tenderFeeRequired',
    tenderFeeAmount: 'tenderFeeAmount',
    tenderFeeModes: 'tenderFeeModes',
    processingFeeRequired: 'processingFeeRequired',
    processingFeeAmount: 'processingFeeAmount',
    processingFeeModes: 'processingFeeModes',
    tenderValue: 'tenderValue',
    bidValidityDays: 'bidValidityDays',
    reverseAuctionApplicable: 'reverseAuctionApplicable',
    commercialEvaluation: 'commercialEvaluation',
    mafRequired: 'mafRequired',
    deliveryTimeSupply: 'deliveryTimeSupply',
    deliveryTimeInstallationInclusive: 'deliveryTimeInstallationInclusive',
    deliveryTimeInstallationDays: 'deliveryTimeInstallation',
    paymentTermsSupply: 'paymentTermsSupply',
    paymentTermsInstallation: 'paymentTermsInstallation',
    pbgRequired: 'pbgRequired',
    pbgPercentage: 'pbgPercentage',
    pbgDurationMonths: 'pbgDurationMonths',
    pbgMode: 'pbgForm',
    sdRequired: 'sdRequired',
    sdPercentage: 'securityDepositPercentage',
    sdDurationMonths: 'sdDurationMonths',
    sdMode: 'sdForm',
    ldRequired: 'ldRequired',
    ldPercentagePerWeek: 'ldPercentagePerWeek',
    maxLdPercentage: 'maxLdPercentage',
    physicalDocsRequired: 'physicalDocsRequired',
    physicalDocsDeadline: 'physicalDocsDeadline',
    orderValue1: 'orderValue1',
    orderValue2: 'orderValue2',
    orderValue3: 'orderValue3',
    techEligibilityAge: 'techEligibilityAgeYears',
    avgAnnualTurnoverType: 'avgAnnualTurnoverCriteria',
    avgAnnualTurnoverValue: 'avgAnnualTurnoverValue',
    workingCapitalType: 'workingCapitalCriteria',
    workingCapitalValue: 'workingCapitalValue',
    netWorthType: 'netWorthCriteria',
    netWorthValue: 'netWorthValue',
    solvencyCertificateType: 'solvencyCertificateCriteria',
    solvencyCertificateValue: 'solvencyCertificateValue',
    courierAddress: 'courierAddress',
    clientContacts: 'clients',
    clients: 'clients',
};

/**
 * Extracts review indicators (amber dot) for fields with fallback/low confidence or missing clauses.
 */
export function extractFieldIndicators(
    fields: Record<string, ExtractedField> | undefined | null,
    missingFields: string[] | undefined | null,
): Record<string, FieldIndicator> {
    const indicators: Record<string, FieldIndicator> = {};

    if (fields) {
        for (const [key, field] of Object.entries(fields)) {
            const formKey = EXTRACTION_TO_FORM_FIELD_MAP[key] || key;
            const confidence = String(field?.confidence || '').toLowerCase();

            if (confidence === 'high') {
                indicators[formKey] = {
                    type: 'high',
                    label: 'High Confidence',
                    message: `Extracted with high confidence (${field.source || 'document'}).`,
                    confidenceValue: 'High',
                    suggestedValue: field.value,
                    source: field.source,
                };
            } else if (confidence === 'fallback') {
                indicators[formKey] = {
                    type: 'fallback',
                    label: 'AI Fallback',
                    message: `Extracted using AI fallback logic (${field.source || 'heuristic'}). Please verify.`,
                    confidenceValue: 'Fallback',
                    suggestedValue: field.value,
                    source: field.source,
                };
            } else if (confidence === 'low') {
                indicators[formKey] = {
                    type: 'low',
                    label: 'Low Confidence',
                    message: `Extracted with low confidence (${field.source || 'regex'}). Please verify.`,
                    confidenceValue: 'Low',
                    suggestedValue: field.value,
                    source: field.source,
                };
            }
        }
    }

    if (Array.isArray(missingFields)) {
        for (const missingKey of missingFields) {
            const formKey = EXTRACTION_TO_FORM_FIELD_MAP[missingKey] || missingKey;
            if (!indicators[formKey]) {
                indicators[formKey] = {
                    type: 'missing',
                    label: 'Missing in PDF',
                    message: 'Clause was not found in the tender PDF. Please review and fill manually.',
                };
            }
        }
    }

    if (indicators['clients']) {
        indicators['clients.0.clientName'] = indicators['clients'];
    }
    if (indicators['courierAddress']) {
        indicators['courierAddressLine1'] = indicators['courierAddress'];
    }

    return indicators;
}

/**
 * Determines whether a field in the form is empty and safe to populate without
 * overwriting existing user work.
 *
 * Strict non-destructive rules:
 * 1. undefined / null: empty -> safe to populate.
 * 2. string: empty string or whitespace-only -> empty (safe). Any non-empty string -> preserved.
 * 3. array: length === 0 -> empty (safe).
 *    - For 'clients': default template row has empty strings [{ clientName: ''... }].
 *      If no client has a non-empty name, it is treated as empty (safe).
 * 4. number:
 *    - NaN -> empty (safe).
 *    - If the user explicitly typed/modified this field (form.formState.dirtyFields[key] === true):
 *      -> NOT empty (preserves user work, even if the TE genuinely typed 0!).
 *    - If untouched (!dirtyFields[key]):
 *      - In buildDefaultValues, numeric fields default to 0 as dummy placeholders.
 *        If current === 0 and untouched, it is safe to populate with the extracted value.
 *      - If current !== 0 and untouched (e.g. pre-filled tender value/EMD from basic details),
 *        it is preserved as NOT empty.
 * 5. boolean:
 *    - If user modified it (dirty), NOT empty.
 *    - If untouched, safe to set from extracted boolean.
 */
export function isFieldEmpty(
    form: UseFormReturn<TenderInfoSheetFormValues>,
    key: keyof TenderInfoSheetFormValues,
    current: unknown,
): boolean {
    if (current === undefined || current === null) {
        return true;
    }

    if (typeof current === 'string') {
        return current.trim() === '';
    }

    if (typeof current === 'number') {
        if (isNaN(current)) return true;
        // If user actively typed/modified this field, NEVER overwrite (even if 0)
        const isDirty = Boolean(form.formState.dirtyFields?.[key as any]);
        if (isDirty) {
            return false;
        }
        // If untouched by user: 0 in buildDefaultValues is a placeholder default.
        // It is safe to populate from extraction.
        // A non-zero value already present (e.g., tender?.emd from basic details) is preserved.
        return current === 0;
    }

    if (Array.isArray(current)) {
        if (current.length === 0) return true;
        if (key === 'clients') {
            const hasAnyClient = current.some(
                (c: any) => c && typeof c === 'object' && c.clientName && String(c.clientName).trim() !== ''
            );
            return !hasAnyClient;
        }
        return false;
    }

    if (typeof current === 'boolean') {
        const isDirty = Boolean(form.formState.dirtyFields?.[key as any]);
        return !isDirty;
    }

    return false;
}

export interface PopulateOptions {
    /** Force overwrite existing values even if not empty */
    overwriteExisting?: boolean;
}

/**
 * Populates form fields from the VolksAI auto-extraction response.
 * Uses form.setValue with { shouldDirty: true, shouldValidate: true }
 * while guarding all fields against overwriting existing user work.
 */
export function populateFormFromExtraction(
    form: UseFormReturn<TenderInfoSheetFormValues>,
    fields: Record<string, ExtractedField> | undefined | null,
    options?: PopulateOptions,
): PopulateResult {
    if (!fields) {
        return { populatedCount: 0, populatedKeys: [] };
    }

    const populatedKeys: string[] = [];
    const overwrite = Boolean(options?.overwriteExisting);

    const setField = <K extends keyof TenderInfoSheetFormValues>(
        key: K,
        val: TenderInfoSheetFormValues[K],
    ) => {
        if (val !== undefined && val !== null) {
            const current = form.getValues(key as any);
            if (overwrite || isFieldEmpty(form, key, current)) {
                form.setValue(key as any, val as any, { shouldDirty: true, shouldValidate: true });
                populatedKeys.push(key);
            }
        }
    };

    // ─── 1. EMD ─────────────────────────────────────────────────────────────
    if (fields.emdRequired?.value) {
        const val = String(fields.emdRequired.value).toUpperCase();
        if (val === 'YES' || val === 'NO' || val === 'EXEMPT') {
            setField('emdRequired', val as 'YES' | 'NO' | 'EXEMPT');
        }
    }
    if (fields.emdAmount?.value != null) {
        const num = Number(fields.emdAmount.value);
        if (!isNaN(num)) setField('emdAmount', num);
    }
    if (Array.isArray(fields.emdModes?.value) && fields.emdModes.value.length > 0) {
        setField('emdModes', fields.emdModes.value.map(String));
    }

    // ─── 2. Tender Fee ──────────────────────────────────────────────────────
    if (fields.tenderFeeRequired?.value) {
        const val = String(fields.tenderFeeRequired.value).toUpperCase();
        if (val === 'YES' || val === 'NO') {
            setField('tenderFeeRequired', val as 'YES' | 'NO');
        }
    } else if (fields.tenderFeeAmount?.value != null && Number(fields.tenderFeeAmount.value) > 0) {
        setField('tenderFeeRequired', 'YES');
    } else if (fields.tenderFeeAmount?.confidence === 'not_applicable' || fields.tenderFeeAmount?.value === 0) {
        setField('tenderFeeRequired', 'NO');
    }

    if (fields.tenderFeeAmount?.value != null) {
        const num = Number(fields.tenderFeeAmount.value);
        if (!isNaN(num)) setField('tenderFeeAmount', num);
    }
    if (Array.isArray(fields.tenderFeeModes?.value) && fields.tenderFeeModes.value.length > 0) {
        setField('tenderFeeModes', fields.tenderFeeModes.value.map(String));
    }

    // ─── 3. Processing Fee ──────────────────────────────────────────────────
    if (fields.processingFeeRequired?.value) {
        const val = String(fields.processingFeeRequired.value).toUpperCase();
        if (val === 'YES' || val === 'NO') {
            setField('processingFeeRequired', val as 'YES' | 'NO');
        }
    } else if (fields.processingFeeAmount?.value != null && Number(fields.processingFeeAmount.value) > 0) {
        setField('processingFeeRequired', 'YES');
    } else if (fields.processingFeeAmount?.confidence === 'not_applicable' || fields.processingFeeAmount?.value === 0) {
        setField('processingFeeRequired', 'NO');
    }

    if (fields.processingFeeAmount?.value != null) {
        const num = Number(fields.processingFeeAmount.value);
        if (!isNaN(num)) setField('processingFeeAmount', num);
    }
    if (Array.isArray(fields.processingFeeModes?.value) && fields.processingFeeModes.value.length > 0) {
        setField('processingFeeModes', fields.processingFeeModes.value.map(String));
    }

    // ─── 4. Tender Value ────────────────────────────────────────────────────
    if (fields.tenderValue?.value != null) {
        const num = Number(fields.tenderValue.value);
        if (!isNaN(num) && num > 0) setField('tenderValue', num);
    }

    // ─── 5. Terms & Evaluation ──────────────────────────────────────────────
    if (fields.bidValidityDays?.value != null) {
        const num = Number(fields.bidValidityDays.value);
        if (!isNaN(num) && num >= 0) setField('bidValidityDays', num);
    }
    if (fields.reverseAuctionApplicable?.value) {
        const val = String(fields.reverseAuctionApplicable.value).toUpperCase();
        if (val === 'YES' || val === 'NO') {
            setField('reverseAuctionApplicable', val as 'YES' | 'NO');
        }
    }
    if (fields.commercialEvaluation?.value) {
        setField('commercialEvaluation', String(fields.commercialEvaluation.value) as any);
    }
    if (fields.mafRequired?.value) {
        setField('mafRequired', String(fields.mafRequired.value) as any);
    }

    // ─── 6. Delivery Time ───────────────────────────────────────────────────
    if (fields.deliveryTimeSupply?.value != null) {
        const num = Number(fields.deliveryTimeSupply.value);
        if (!isNaN(num) && num > 0) setField('deliveryTimeSupply', num);
    }
    if (fields.deliveryTimeInstallationInclusive?.value != null) {
        setField(
            'deliveryTimeInstallationInclusive',
            Boolean(fields.deliveryTimeInstallationInclusive.value),
        );
    }
    if (fields.deliveryTimeInstallationDays?.value != null) {
        const num = Number(fields.deliveryTimeInstallationDays.value);
        if (!isNaN(num) && num > 0) setField('deliveryTimeInstallation', num);
    }

    // ─── 7. Payment Terms ───────────────────────────────────────────────────
    if (fields.paymentTermsSupply?.value != null) {
        const num = Number(fields.paymentTermsSupply.value);
        if (!isNaN(num) && num >= 0) setField('paymentTermsSupply', num);
    }
    if (fields.paymentTermsInstallation?.value != null) {
        const num = Number(fields.paymentTermsInstallation.value);
        if (!isNaN(num) && num >= 0) setField('paymentTermsInstallation', num);
    }

    // ─── 8. PBG ─────────────────────────────────────────────────────────────
    if (fields.pbgRequired?.value) {
        const val = String(fields.pbgRequired.value).toUpperCase();
        if (val === 'YES' || val === 'NO') {
            setField('pbgRequired', val as 'YES' | 'NO');
        }
    } else if (fields.pbgPercentage?.value != null && Number(fields.pbgPercentage.value) > 0) {
        setField('pbgRequired', 'YES');
    }

    if (fields.pbgPercentage?.value != null) {
        const num = Number(fields.pbgPercentage.value);
        if (!isNaN(num) && num >= 0) setField('pbgPercentage', num);
    }
    if (fields.pbgDurationMonths?.value != null) {
        const num = Number(fields.pbgDurationMonths.value);
        if (!isNaN(num) && num >= 0) setField('pbgDurationMonths', num);
    }
    if (Array.isArray(fields.pbgMode?.value) && fields.pbgMode.value.length > 0) {
        setField('pbgForm', fields.pbgMode.value.map(String));
    }

    // ─── 9. Security Deposit (SD) ───────────────────────────────────────────
    if (fields.sdPercentage?.value != null && Number(fields.sdPercentage.value) > 0) {
        setField('sdRequired', 'YES');
        setField('securityDepositPercentage', Number(fields.sdPercentage.value));
    }
    if (fields.sdDurationMonths?.value != null) {
        const num = Number(fields.sdDurationMonths.value);
        if (!isNaN(num) && num >= 0) setField('sdDurationMonths', num);
    }
    if (Array.isArray(fields.sdMode?.value) && fields.sdMode.value.length > 0) {
        setField('sdForm', fields.sdMode.value.map(String));
    }

    // ─── 10. Liquidated Damages (LD) ────────────────────────────────────────
    if (fields.ldPercentagePerWeek?.value != null || fields.maxLdPercentage?.value != null) {
        setField('ldRequired', 'YES');
        if (fields.ldPercentagePerWeek?.value != null) {
            const num = Number(fields.ldPercentagePerWeek.value);
            if (!isNaN(num)) setField('ldPercentagePerWeek', num);
        }
        if (fields.maxLdPercentage?.value != null) {
            const num = Number(fields.maxLdPercentage.value);
            if (!isNaN(num)) setField('maxLdPercentage', num);
        }
    }

    // ─── 11. Physical Documents ─────────────────────────────────────────────
    if (fields.physicalDocsRequired?.value) {
        const val = String(fields.physicalDocsRequired.value).toUpperCase();
        if (val === 'YES' || val === 'NO') {
            setField('physicalDocsRequired', val as 'YES' | 'NO');
        }
    }
    if (fields.physicalDocsDeadline?.value) {
        setField('physicalDocsDeadline', String(fields.physicalDocsDeadline.value));
    }

    // ─── 12. Work Values & Tech Eligibility ─────────────────────────────────
    let hasOrderValues = false;
    if (fields.orderValue1?.value != null) {
        const num = Number(fields.orderValue1.value);
        if (!isNaN(num)) {
            setField('orderValue1', num);
            hasOrderValues = true;
        }
    }
    if (fields.orderValue2?.value != null) {
        const num = Number(fields.orderValue2.value);
        if (!isNaN(num)) {
            setField('orderValue2', num);
            hasOrderValues = true;
        }
    }
    if (fields.orderValue3?.value != null) {
        const num = Number(fields.orderValue3.value);
        if (!isNaN(num)) {
            setField('orderValue3', num);
            hasOrderValues = true;
        }
    }
    if (hasOrderValues) {
        setField('workValueType', 'WORKS_VALUES');
    }
    if (fields.techEligibilityAge?.value != null) {
        const num = Number(fields.techEligibilityAge.value);
        if (!isNaN(num)) setField('techEligibilityAgeYears', num);
    }

    // ─── 13. Financial Criteria (Turnover, WC, NW, Solvency) ─────────────────
    if (fields.avgAnnualTurnoverType?.value) {
        setField('avgAnnualTurnoverCriteria', String(fields.avgAnnualTurnoverType.value) as any);
    }
    if (fields.avgAnnualTurnoverValue?.value != null) {
        const num = Number(fields.avgAnnualTurnoverValue.value);
        if (!isNaN(num)) setField('avgAnnualTurnoverValue', num);
    }

    if (fields.workingCapitalType?.value) {
        setField('workingCapitalCriteria', String(fields.workingCapitalType.value) as any);
    }
    if (fields.workingCapitalValue?.value != null) {
        const num = Number(fields.workingCapitalValue.value);
        if (!isNaN(num)) setField('workingCapitalValue', num);
    }

    if (fields.netWorthType?.value) {
        setField('netWorthCriteria', String(fields.netWorthType.value) as any);
    }
    if (fields.netWorthValue?.value != null) {
        const num = Number(fields.netWorthValue.value);
        if (!isNaN(num)) setField('netWorthValue', num);
    }

    if (fields.solvencyCertificateType?.value) {
        setField('solvencyCertificateCriteria', String(fields.solvencyCertificateType.value) as any);
    }
    if (fields.solvencyCertificateValue?.value != null) {
        const num = Number(fields.solvencyCertificateValue.value);
        if (!isNaN(num)) setField('solvencyCertificateValue', num);
    }

    // ─── 14. Courier Address ────────────────────────────────────────────────
    if (fields.courierAddress?.value) {
        const address = String(fields.courierAddress.value).trim();
        if (address) {
            setField('courierAddress', address);
            setField('courierDetailsPresent', 'YES');
        }
    }

    // ─── 15. Client Contacts ────────────────────────────────────────────────
    const clientList = Array.isArray(fields.clientContacts?.value)
        ? fields.clientContacts.value
        : Array.isArray(fields.clients?.value)
            ? fields.clients.value
            : [];

    if (clientList.length > 0) {
        const validClients = clientList
            .filter((c: any) => c && c.clientName && String(c.clientName).toLowerCase() !== 'unknown')
            .map((c: any) => ({
                clientName: String(c.clientName).trim(),
                clientDesignation: c.clientDesignation ? String(c.clientDesignation).trim() : '',
                clientMobile:
                    c.clientMobile && String(c.clientMobile).toLowerCase() !== 'unknown'
                        ? String(c.clientMobile).trim()
                        : '',
                clientEmail:
                    c.clientEmail && String(c.clientEmail).toLowerCase() !== 'unknown'
                        ? String(c.clientEmail).trim()
                        : '',
            }));

        if (validClients.length > 0) {
            setField('clients', validClients);
            setField('clientDetailsPresent', 'YES');
        }
    }

    return {
        populatedCount: populatedKeys.length,
        populatedKeys,
    };
}
