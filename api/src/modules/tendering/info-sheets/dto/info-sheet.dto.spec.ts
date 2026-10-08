import { z } from 'zod';
import { optionalNumber, TenderInfoSheetPayloadSchema } from './info-sheet.dto';

/**
 * optionalNumber used to be z.union([schema, z.undefined(), z.null(), z.literal('')]).
 * zod tries union members in order and z.coerce.number() coerces null and '' to 0, so
 * every "not stated" numeric field (EMD amount, turnover, experience years, ...) was saved
 * as 0. These tests pin the fixed behaviour on the real DTO schema.
 */

const NUMERIC_FIELDS = [
    'processingFeeAmount', 'tenderFeeAmount', 'emdAmount', 'tenderValue', 'bidValidityDays',
    'paymentTermsSupply', 'paymentTermsInstallation', 'deliveryTimeSupply', 'deliveryTimeInstallationDays',
    'pbgPercentage', 'pbgDurationMonths', 'sdPercentage', 'sdDurationMonths', 'ldPercentagePerWeek',
    'maxLdPercentage', 'techEligibilityAge', 'orderValue1', 'orderValue2', 'orderValue3',
    'avgAnnualTurnoverValue', 'workingCapitalValue', 'solvencyCertificateValue', 'netWorthValue',
] as const;

// Fields whose validators reject 0 (so 0 is a validation error, not a stored value).
const POSITIVE_ONLY = new Set(['deliveryTimeSupply', 'deliveryTimeInstallationDays']);

function fieldSchema(name: string): z.ZodTypeAny {
    const s: any = TenderInfoSheetPayloadSchema;
    const shape = s.shape ?? s._def?.schema?.shape ?? s._def?.innerType?.shape;
    if (!shape?.[name]) throw new Error(`DTO field ${name} not found`);
    return shape[name];
}

describe('optionalNumber', () => {
    const f = optionalNumber(z.coerce.number().nonnegative());

    it.each([
        ['null', null],
        ['undefined', undefined],
        ['empty string', ''],
        ['whitespace string', '   '],
    ])('%s -> null (not 0)', (_label, input) => {
        expect(f.parse(input)).toBeNull();
    });

    it('keeps a real 0', () => {
        expect(f.parse(0)).toBe(0);
        expect(f.parse('0')).toBe(0);
    });

    it('coerces numeric strings and keeps numbers', () => {
        expect(f.parse('80144')).toBe(80144);
        expect(f.parse(7)).toBe(7);
    });

    it('still rejects invalid values', () => {
        expect(f.safeParse('abc').success).toBe(false);
        expect(f.safeParse(-5).success).toBe(false);
    });
});

describe('TenderInfoSheetPayloadSchema numeric fields', () => {
    it.each(NUMERIC_FIELDS)('%s: null / "" / undefined are stored as null', (name) => {
        const s = fieldSchema(name);
        expect(s.parse(null)).toBeNull();
        expect(s.parse('')).toBeNull();
        expect(s.parse(undefined)).toBeNull();
    });

    it.each(NUMERIC_FIELDS.filter((n) => !POSITIVE_ONLY.has(n)))('%s: a real 0 is kept as 0', (name) => {
        expect(fieldSchema(name).parse(0)).toBe(0);
    });

    it('payment terms 100 / 0 survive validation (0% installation is a real term)', () => {
        expect(fieldSchema('paymentTermsSupply').parse(100)).toBe(100);
        expect(fieldSchema('paymentTermsInstallation').parse(0)).toBe(0);
    });

    it('ldType, grievanceContact, grievanceEmail, and llm_status pass payload validation', () => {
        const parsed = TenderInfoSheetPayloadSchema.parse({
            teRecommendation: 'YES',
            ldType: 'PRS',
            grievanceContact: 'Shri Shari Kumar, GM (P&C)',
            grievanceEmail: 'sharikumar@gail.co.in',
            llm_status: 'ok',
            clients: [{ clientName: 'Allan Tomy', clientEmail: 'allan.tomy@gail.co.in' }],
        });
        expect(parsed.ldType).toBe('PRS');
        expect(parsed.grievanceContact).toBe('Shri Shari Kumar, GM (P&C)');
        expect(parsed.grievanceEmail).toBe('sharikumar@gail.co.in');
        expect(parsed.llm_status).toBe('ok');
    });

    it('accepts clients with clientEmail as null, undefined, or empty string when mobile is present', () => {
        const parsedNull = TenderInfoSheetPayloadSchema.parse({
            teRecommendation: 'YES',
            clients: [{ clientName: 'Vendor Lead', clientEmail: null, clientMobile: '9876543210' }],
        });
        expect(parsedNull.clients?.[0].clientEmail).toBeNull();

        const parsedEmpty = TenderInfoSheetPayloadSchema.parse({
            teRecommendation: 'YES',
            clients: [{ clientName: 'Vendor Lead', clientEmail: '', clientMobile: '9876543210' }],
        });
        expect(parsedEmpty.clients?.[0].clientEmail).toBeNull();
    });
});

