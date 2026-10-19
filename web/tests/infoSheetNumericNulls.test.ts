// Run with: npm run test:unit
//
// Numeric info-sheet fields must keep "not stated" as empty, never 0. VolksAI sends null
// for a value the tender doesn't state (e.g. experience years), but the form used to show
// and save 0: 0 defaults, a toNumber() fallback to 0, z.coerce.number() turning null/''
// into 0, and 0-default tender-record seeds (gst_values / tender_fees / emd are
// NOT NULL DEFAULT 0 in tender_infos).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    buildDefaultValues,
    mapFormToPayload,
    mapResponseToForm,
    toOptionalNumber,
    toSeedAmount,
} from '../src/modules/tendering/info-sheet/helpers/tenderInfoSheet.mappers.ts';
import { TenderInformationFormSchema } from '../src/modules/tendering/info-sheet/helpers/tenderInfoSheet.schema.ts';

// form field -> API response field
const NUMERIC_FIELDS: Record<string, string> = {
    processingFeeAmount: 'processingFeeAmount',
    tenderFeeAmount: 'tenderFeeAmount',
    emdAmount: 'emdAmount',
    tenderValue: 'tenderValue',
    paymentTermsSupply: 'paymentTermsSupply',
    paymentTermsInstallation: 'paymentTermsInstallation',
    deliveryTimeSupply: 'deliveryTimeSupply',
    pbgPercentage: 'pbgPercentage',
    pbgDurationMonths: 'pbgDurationMonths',
    securityDepositPercentage: 'sdPercentage',
    sdDurationMonths: 'sdDurationMonths',
    ldPercentagePerWeek: 'ldPercentagePerWeek',
    maxLdPercentage: 'maxLdPercentage',
    techEligibilityAgeYears: 'techEligibilityAge',
    orderValue1: 'orderValue1',
    orderValue2: 'orderValue2',
    orderValue3: 'orderValue3',
    avgAnnualTurnoverValue: 'avgAnnualTurnoverValue',
    workingCapitalValue: 'workingCapitalValue',
    solvencyCertificateValue: 'solvencyCertificateValue',
    netWorthValue: 'netWorthValue',
};

test('toOptionalNumber: null / undefined / "" / garbage / NA -> undefined; real values (incl. 0) kept', () => {
    for (const v of [null, undefined, '', '   ', 'abc', 'NA', 'N/A', 'None']) assert.equal(toOptionalNumber(v as any), undefined);
    assert.equal(toOptionalNumber('0.00'), 0);
    assert.equal(toOptionalNumber('0'), 0);
    assert.equal(toOptionalNumber(0), 0);
    assert.equal(toOptionalNumber('80144.00'), 80144);
    assert.equal(toOptionalNumber(80144), 80144);
});

test('toSeedAmount: tender-record 0 default means "never entered"', () => {
    assert.equal(toSeedAmount('0.00'), undefined);
    assert.equal(toSeedAmount('0'), undefined);
    assert.equal(toSeedAmount(0), undefined);
    assert.equal(toSeedAmount(null), undefined);
    assert.equal(toSeedAmount(undefined), undefined);
    assert.equal(toSeedAmount('NA'), undefined);
    assert.equal(toSeedAmount('80144.00'), 80144);
});

test('new form: every numeric field starts empty, even when the tender record holds its 0 defaults', () => {
    const defaults = buildDefaultValues({ gstValues: '0.00', tenderFees: '0.00', emd: '0.00' } as any) as any;
    for (const field of Object.keys(NUMERIC_FIELDS)) {
        assert.equal(defaults[field], undefined, `${field} defaulted to ${defaults[field]}`);
    }
});

test('new form: a real tender-record amount is still used as the seed', () => {
    const defaults = buildDefaultValues({ gstValues: '1500000.00', tenderFees: '0.00', emd: '80144.00' } as any) as any;
    assert.equal(defaults.tenderValue, 1500000);
    assert.equal(defaults.emdAmount, 80144);
    assert.equal(defaults.tenderFeeAmount, undefined);
});

test('saved sheet with nulls: every numeric field loads as empty, not 0', () => {
    const response: Record<string, unknown> = { teRecommendation: 'YES' };
    for (const apiField of Object.values(NUMERIC_FIELDS)) response[apiField] = null;
    const form = mapResponseToForm(response as any, null) as any;
    for (const field of Object.keys(NUMERIC_FIELDS)) {
        assert.equal(form[field], undefined, `${field} loaded as ${form[field]}`);
    }
});

test('saved sheet with real values: numeric strings and a real 0 are kept', () => {
    const form = mapResponseToForm({
        teRecommendation: 'YES',
        techEligibilityAge: 7,
        emdAmount: '80144.00',
        paymentTermsSupply: 100,
        paymentTermsInstallation: 0,
    } as any, null) as any;
    assert.equal(form.techEligibilityAgeYears, 7);
    assert.equal(form.emdAmount, 80144);
    assert.equal(form.paymentTermsSupply, 100);
    assert.equal(form.paymentTermsInstallation, 0);
});

test('form schema: cleared input (null), undefined, "", "   ", "NA", "N/A" validate as empty, not 0', () => {
    const shape = (TenderInformationFormSchema as any).shape;
    for (const field of Object.keys(NUMERIC_FIELDS)) {
        if (field === 'deliveryTimeSupply') continue; // own preprocess (0 -> null), unchanged
        const s = shape[field];
        assert.ok(s, `schema field ${field} missing`);
        assert.equal(s.parse(null), undefined, `${field}: null -> ${s.parse(null)}`);
        assert.equal(s.parse(undefined), undefined, `${field}: undefined -> ${s.parse(undefined)}`);
        assert.equal(s.parse(''), undefined, `${field}: '' -> ${s.parse('')}`);
        assert.equal(s.parse('   '), undefined, `${field}: '   ' -> ${s.parse('   ')}`);
        assert.equal(s.parse('NA'), undefined, `${field}: 'NA' -> ${s.parse('NA')}`);
        assert.equal(s.parse('N/A'), undefined, `${field}: 'N/A' -> ${s.parse('N/A')}`);
        assert.equal(s.parse(0), 0, `${field}: 0 must stay 0`);
        assert.equal(s.parse('0'), 0, `${field}: '0' must stay 0`);
        assert.equal(s.parse(5), 5, `${field}: 5 -> 5`);
        assert.equal(s.parse('5'), 5, `${field}: '5' -> 5`);
    }
});

test('save payload: emdAmount and fee amounts cover null, undefined, empty string, "NA", "0", 0, and valid positive number', () => {
    // When unset / undefined / null / '' / 'NA' / 'N/A'
    for (const emptyVal of [null, undefined, '', '   ', 'NA', 'N/A']) {
        const parsed = (TenderInformationFormSchema as any).shape.emdAmount.parse(emptyVal);
        assert.equal(parsed, undefined);
        const payload = mapFormToPayload({
            ...buildDefaultValues(null),
            teRecommendation: 'YES',
            emdRequired: 'YES',
            emdAmount: parsed,
            tenderFeeRequired: 'YES',
            tenderFeeAmount: (TenderInformationFormSchema as any).shape.tenderFeeAmount.parse(emptyVal),
            processingFeeRequired: 'YES',
            processingFeeAmount: (TenderInformationFormSchema as any).shape.processingFeeAmount.parse(emptyVal),
        } as any);
        assert.equal(payload.emdAmount, null);
        assert.equal(payload.tenderFeeAmount, null);
        assert.equal(payload.processingFeeAmount, null);
    }

    // When real 0 (number 0 or string '0')
    for (const zeroVal of [0, '0']) {
        const parsed = (TenderInformationFormSchema as any).shape.emdAmount.parse(zeroVal);
        assert.equal(parsed, 0);
        const payload = mapFormToPayload({
            ...buildDefaultValues(null),
            teRecommendation: 'YES',
            emdRequired: 'YES',
            emdAmount: parsed,
            tenderFeeRequired: 'YES',
            tenderFeeAmount: (TenderInformationFormSchema as any).shape.tenderFeeAmount.parse(zeroVal),
            processingFeeRequired: 'YES',
            processingFeeAmount: (TenderInformationFormSchema as any).shape.processingFeeAmount.parse(zeroVal),
        } as any);
        assert.equal(payload.emdAmount, 0);
        assert.equal(payload.tenderFeeAmount, 0);
        assert.equal(payload.processingFeeAmount, 0);
    }

    // When valid positive number
    for (const posVal of [80144, '80144']) {
        const parsed = (TenderInformationFormSchema as any).shape.emdAmount.parse(posVal);
        assert.equal(parsed, 80144);
        const payload = mapFormToPayload({
            ...buildDefaultValues(null),
            teRecommendation: 'YES',
            emdRequired: 'YES',
            emdAmount: parsed,
            tenderFeeRequired: 'YES',
            tenderFeeAmount: (TenderInformationFormSchema as any).shape.tenderFeeAmount.parse(posVal),
            processingFeeRequired: 'YES',
            processingFeeAmount: (TenderInformationFormSchema as any).shape.processingFeeAmount.parse(posVal),
        } as any);
        assert.equal(payload.emdAmount, 80144);
        assert.equal(payload.tenderFeeAmount, 80144);
        assert.equal(payload.processingFeeAmount, 80144);
    }
});

test('save: unset experience years is sent as null; 100/0 payment terms keep the real 0%', () => {
    const values = { ...buildDefaultValues(null), teRecommendation: 'YES', paymentTermsSupply: 100, paymentTermsInstallation: 0 } as any;
    const payload = mapFormToPayload(values) as any;
    assert.equal(payload.techEligibilityAge, null);
    assert.equal(payload.paymentTermsSupply, 100);
    assert.equal(payload.paymentTermsInstallation, 0);
});

test('round trip: API null -> form -> save payload stays null (never becomes 0)', () => {
    const response: Record<string, unknown> = { teRecommendation: 'YES' };
    for (const apiField of Object.values(NUMERIC_FIELDS)) response[apiField] = null;
    const payload = mapFormToPayload(mapResponseToForm(response as any, null)) as any;
    for (const apiField of Object.values(NUMERIC_FIELDS)) {
        if (!(apiField in payload)) continue;
        assert.equal(payload[apiField], null, `${apiField} saved as ${payload[apiField]}`);
    }
});

test('form schema: requires positive emdAmount when emdRequired is YES', () => {
    const baseForm = {
        ...buildDefaultValues(null),
        teRecommendation: 'YES',
        emdRequired: 'YES',
        emdModes: ['BG'],
        clients: [{ clientName: 'Lead Client', clientMobile: '9876543210' }],
    };

    // Fails on null, undefined, 0, or negative emdAmount
    assert.equal(TenderInformationFormSchema.safeParse({ ...baseForm, emdAmount: null }).success, false);
    assert.equal(TenderInformationFormSchema.safeParse({ ...baseForm, emdAmount: undefined }).success, false);
    assert.equal(TenderInformationFormSchema.safeParse({ ...baseForm, emdAmount: 0 }).success, false);
    assert.equal(TenderInformationFormSchema.safeParse({ ...baseForm, emdAmount: -100 }).success, false);

    // Passes on positive emdAmount
    const valid = TenderInformationFormSchema.safeParse({ ...baseForm, emdAmount: 50000 });
    assert.equal(valid.success, true);

    // Allows null/undefined when emdRequired is NO or EXEMPT
    assert.equal(TenderInformationFormSchema.safeParse({ ...baseForm, emdRequired: 'NO', emdAmount: undefined }).success, true);
    assert.equal(TenderInformationFormSchema.safeParse({ ...baseForm, emdRequired: 'EXEMPT', emdAmount: undefined }).success, true);

    // Allows null/undefined when teRecommendation is NO (rejection)
    const rejection = TenderInformationFormSchema.safeParse({
        ...baseForm,
        teRecommendation: 'NO',
        teRejectionReason: 1,
        teRejectionRemarks: 'Not viable',
        teRejectionProof: ['proof.pdf'],
        emdRequired: 'YES',
        emdAmount: undefined,
    });
    assert.equal(rejection.success, true);
});
