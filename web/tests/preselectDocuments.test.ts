// Run with: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    computeAutoPreselectedDocuments,
    resolveStandardDocValue,
    STANDARD_CHECKLIST_DOCUMENTS,
    STANDARD_DOCUMENT_OPTIONS,
} from '../src/modules/tendering/checklists/helpers/preselectDocuments.ts';
import type { SuggestedBiddingRequirement } from '../src/modules/tendering/checklists/helpers/documentChecklist.types.ts';

const SAMPLE_REQUIREMENTS: SuggestedBiddingRequirement[] = [
    {
        documentName: 'PAN and GST copy',
        category: 'standard',
        required: true,
        source: { document: 'atc', page: 5, snippet: 'PAN and GST required' },
        matchedLibraryId: 'std:pan_gst',
        confidence: 'high',
        reasoning: 'Standard statutory document',
    },
    {
        documentName: 'MSME / Udyam Certificate',
        category: 'standard',
        required: true,
        source: { document: 'atc', page: 7, snippet: 'MSME certificate' },
        matchedLibraryId: 'std:msme',
        confidence: 'high',
        reasoning: 'MSME exemption',
    },
    {
        documentName: 'OEM Authorization Letter',
        category: 'oem',
        required: true,
        source: { document: 'atc', page: 12, snippet: 'OEM authorization' },
        matchedLibraryId: null,
        confidence: 'high',
        reasoning: 'Tender specific OEM form',
    },
];

test('Single source of truth: STANDARD_DOCUMENT_OPTIONS matches STANDARD_CHECKLIST_DOCUMENTS', () => {
    assert.equal(STANDARD_DOCUMENT_OPTIONS.length, STANDARD_CHECKLIST_DOCUMENTS.length);
    for (let i = 0; i < STANDARD_CHECKLIST_DOCUMENTS.length; i++) {
        assert.equal(STANDARD_DOCUMENT_OPTIONS[i].id, STANDARD_CHECKLIST_DOCUMENTS[i].id);
        assert.equal(STANDARD_DOCUMENT_OPTIONS[i].value, STANDARD_CHECKLIST_DOCUMENTS[i].document_name);
        assert.equal(STANDARD_DOCUMENT_OPTIONS[i].label, STANDARD_CHECKLIST_DOCUMENTS[i].document_name);
    }
});

test('resolveStandardDocValue resolves standard document by matchedLibraryId', () => {
    const panReq = SAMPLE_REQUIREMENTS[0];
    assert.equal(resolveStandardDocValue(panReq), 'PAN & GST');

    const msmeReq = SAMPLE_REQUIREMENTS[1];
    assert.equal(resolveStandardDocValue(msmeReq), 'MSME');

    const oemReq = SAMPLE_REQUIREMENTS[2];
    assert.equal(resolveStandardDocValue(oemReq), null);
});

test('Preselection runs for NEW checklist (mode=create) with empty selection', () => {
    const res = computeAutoPreselectedDocuments({
        currentSelected: [],
        requirements: SAMPLE_REQUIREMENTS,
        mode: 'create',
        existingSelectedDocuments: undefined,
    });

    assert.equal(res.updated, true);
    assert.deepEqual(res.selectedDocuments.sort(), ['MSME', 'PAN & GST'].sort());
});

test('Preselection runs for existing checklist when saved selection is EMPTY', () => {
    const res = computeAutoPreselectedDocuments({
        currentSelected: [],
        requirements: SAMPLE_REQUIREMENTS,
        mode: 'edit',
        existingSelectedDocuments: [],
    });

    assert.equal(res.updated, true);
    assert.deepEqual(res.selectedDocuments.sort(), ['MSME', 'PAN & GST'].sort());
});

test('Preselection NEVER overrides user-unticked items on an existing checklist (mode=edit)', () => {
    // User explicitly unticked MSME and kept only PAN & GST
    const userSelection = ['PAN & GST'];

    const res = computeAutoPreselectedDocuments({
        currentSelected: userSelection,
        requirements: SAMPLE_REQUIREMENTS,
        mode: 'edit',
        existingSelectedDocuments: userSelection,
    });

    // Must NOT re-tick MSME
    assert.equal(res.updated, false);
    assert.deepEqual(res.selectedDocuments, ['PAN & GST']);
});

test('Re-analyzing on an existing checklist does not override unticked items', () => {
    // User had only 'Cancelled Cheque' selected on their existing checklist
    const existing = ['Cancelled Cheque'];

    const res = computeAutoPreselectedDocuments({
        currentSelected: existing,
        requirements: SAMPLE_REQUIREMENTS,
        mode: 'edit',
        existingSelectedDocuments: existing,
    });

    // Unticked items (PAN & GST, MSME) must not be forced back into the checklist
    assert.equal(res.updated, false);
    assert.deepEqual(res.selectedDocuments, ['Cancelled Cheque']);
});
