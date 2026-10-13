// Run with: npm run test:unit
//
// Verification that populateFormFromExtraction safely ignores extended extraction keys
// (requiredDocuments, doc1-doc9, miiPreference, miiRequired, gemBidEndDate, gemBidOpeningDate,
// grievanceContact, grievanceEmail, ldType, llm_status, metadata) where the form has no matching
// field, without throwing or polluting form values.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { populateFormFromExtraction } from '../src/modules/tendering/info-sheet/helpers/tenderInfoSheet.autoExtract.ts';

// Lightweight mock of react-hook-form UseFormReturn
function createMockForm(initialValues: Record<string, any> = {}) {
    const values: Record<string, any> = { ...initialValues };
    const dirtiedFields = new Set<string>();

    return {
        getValues: (key?: string) => (key ? values[key] : values),
        setValue: (key: string, val: any) => {
            values[key] = val;
            dirtiedFields.add(key);
        },
        formState: { dirtyFields: {} },
        _getUnderlyingValues: () => values,
    } as any;
}

test('populateFormFromExtraction ignores extended keys without throwing or polluting form state', () => {
    const mockForm = createMockForm();

    const fields: Record<string, any> = {
        // Standard fields that SHOULD map
        emdRequired: { value: 'YES', confidence: 'high' },
        emdAmount: { value: 50000, confidence: 'high' },

        // Extended keys that MUST be ignored by the form
        requiredDocuments: { value: ['PAN Card', 'GST Registration'], confidence: 'high' },
        doc1: { value: 'PAN Card', confidence: 'high' },
        doc2: { value: 'GST Registration', confidence: 'high' },
        doc3: { value: 'Experience Certificate', confidence: 'high' },
        doc4: { value: null, confidence: 'missing' },
        doc5: { value: null, confidence: 'missing' },
        doc6: { value: null, confidence: 'missing' },
        doc7: { value: null, confidence: 'missing' },
        doc8: { value: null, confidence: 'missing' },
        doc9: { value: null, confidence: 'missing' },
        miiPreference: { value: 'YES', confidence: 'high' },
        miiRequired: { value: 'YES', confidence: 'high' },
        gemBidEndDate: { value: '2026-03-31 15:00:00', confidence: 'high' },
        gemBidOpeningDate: { value: '2026-03-31 15:30:00', confidence: 'high' },
        grievanceContact: { value: 'Nodal Officer', confidence: 'high' },
        grievanceEmail: { value: 'grievance@dept.gov.in', confidence: 'high' },
        ldType: { value: 'PRS', confidence: 'high' },
        llm_status: 'ok',
        metadata: { llm_status: 'ok', failed_categories: [] },
    };

    const result = populateFormFromExtraction(mockForm, fields);

    // Standard fields populated
    assert.equal(mockForm.getValues('emdRequired'), 'YES');
    assert.equal(mockForm.getValues('emdAmount'), 50000);

    // Extended keys MUST NOT be set on the form
    assert.equal(mockForm.getValues('requiredDocuments'), undefined);
    assert.equal(mockForm.getValues('doc1'), undefined);
    assert.equal(mockForm.getValues('doc2'), undefined);
    assert.equal(mockForm.getValues('doc3'), undefined);
    assert.equal(mockForm.getValues('miiPreference'), undefined);
    assert.equal(mockForm.getValues('miiRequired'), undefined);
    assert.equal(mockForm.getValues('gemBidEndDate'), undefined);
    assert.equal(mockForm.getValues('gemBidOpeningDate'), undefined);
    assert.equal(mockForm.getValues('grievanceContact'), undefined);
    assert.equal(mockForm.getValues('grievanceEmail'), undefined);
    assert.equal(mockForm.getValues('ldType'), undefined);
    assert.equal(mockForm.getValues('llm_status'), undefined);
    assert.equal(mockForm.getValues('metadata'), undefined);

    // Result populatedKeys only contains recognized form keys
    assert.deepEqual(result.populatedKeys, ['emdRequired', 'emdAmount']);
    assert.equal(result.populatedCount, 2);
});
