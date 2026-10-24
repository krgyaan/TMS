// Run with: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./helpers/vite-env-loader.mjs', import.meta.url);

import {
    extractInfosheetSuggestions,
    type InfosheetSuggestion,
} from '../src/modules/tendering/checklists/helpers/infosheetSuggestions.ts';

const { computeAutoPreselectedDocuments } = await import(
    '../src/modules/tendering/checklists/helpers/preselectDocuments.ts'
);

// Real Morena (GEM/2025/B/7021103) stored tender_extractions.fields record
const MORENA_STORED_FIELDS: Record<string, any> = {
    requiredDocuments: {
        value: [
            'Experience Criteria',
            'Bidder Turnover',
            'Certificate (Requested in ATC)',
            'OEM Authorization Certificate',
            'Additional Doc 1 (Requested in ATC)',
        ],
        source: 'regex',
        sources: {
            located: false,
            main_tender: null,
            atc: null,
            unlocated: {
                page: null,
                value: [
                    'Experience Criteria',
                    'Bidder Turnover',
                    'Certificate (Requested in ATC)',
                    'OEM Authorization Certificate',
                    'Additional Doc 1 (Requested in ATC)',
                ],
                located: false,
                snippet: null,
                document: 'main_tender',
                raw_value: "['Experience Criteria', 'Bidder Turnover', 'Certificate (Requested in ATC)', 'OEM Authorization Certificate', 'Additional Doc 1 (Requested in ATC)']",
                unlocated_reason: 'value_changed_after_extraction',
            },
        },
        reviewed: false,
        confidence: 'high',
    },
    doc1: {
        value: 'Experience Criteria',
        source: 'regex',
        sources: {
            located: false,
            main_tender: null,
            atc: null,
            unlocated: {
                page: null,
                value: 'Experience Criteria',
                located: false,
                snippet: null,
                document: 'main_tender',
            },
        },
        reviewed: false,
        confidence: 'high',
    },
    doc2: {
        value: 'Bidder Turnover',
        source: 'regex',
        sources: {
            located: false,
            main_tender: null,
            atc: null,
            unlocated: null,
        },
        reviewed: false,
        confidence: 'high',
    },
    doc3: {
        value: 'Certificate (Requested in ATC)',
        source: 'regex',
        sources: {
            located: false,
            main_tender: null,
            atc: null,
            unlocated: null,
        },
        reviewed: false,
        confidence: 'high',
    },
    doc4: {
        value: 'OEM Authorization Certificate',
        source: 'regex',
        sources: {
            located: false,
            main_tender: null,
            atc: null,
            unlocated: null,
        },
        reviewed: false,
        confidence: 'high',
    },
    doc5: {
        value: 'Additional Doc 1 (Requested in ATC)',
        source: 'regex',
        sources: {
            located: false,
            main_tender: null,
            atc: null,
            unlocated: null,
        },
        reviewed: false,
        confidence: 'high',
    },
    doc6: { value: null, source: null, sources: { located: false } },
    doc7: { value: null, source: null, sources: { located: false } },
    doc8: { value: null, source: null, sources: { located: false } },
    doc9: { value: null, source: null, sources: { located: false } },
};

test('Morena stored record extracts all 5 documents without duplicates', () => {
    const suggestions = extractInfosheetSuggestions(MORENA_STORED_FIELDS);
    assert.equal(suggestions.length, 5);

    const docNames = suggestions.map((s) => s.documentName);
    assert.deepEqual(docNames, [
        'Experience Criteria',
        'Bidder Turnover',
        'Certificate (Requested in ATC)',
        'OEM Authorization Certificate',
        'Additional Doc 1 (Requested in ATC)',
    ]);
});

test('every suggestion is labelled "from infosheet extraction (unverified)"', () => {
    const suggestions = extractInfosheetSuggestions(MORENA_STORED_FIELDS);
    for (const s of suggestions) {
        assert.equal(s.label, 'from infosheet extraction (unverified)');
    }
});

test('Morena stored record displays source as rule (regex)', () => {
    const suggestions = extractInfosheetSuggestions(MORENA_STORED_FIELDS);
    for (const s of suggestions) {
        assert.equal(s.sourceType, 'rule');
        assert.equal(s.sourceDisplay, 'rule (regex)');
    }
});

test('located document displays source as located with page number from main tender or ATC', () => {
    const fieldsWithLocated: Record<string, any> = {
        doc1: {
            value: 'Land Title Document',
            sources: {
                located: true,
                main_tender: { page: 4, snippet: 'Land title certificate' },
                atc: null,
            },
        },
        doc2: {
            value: 'Local Content Declaration',
            sources: {
                located: true,
                main_tender: null,
                atc: { page: 11, snippet: 'Make in India declaration' },
            },
        },
        doc3: {
            value: 'PAN Card',
            source: 'rule',
            sources: { located: false },
        },
    };

    const suggestions = extractInfosheetSuggestions(fieldsWithLocated);
    assert.equal(suggestions.length, 3);

    assert.equal(suggestions[0].sourceType, 'located');
    assert.equal(suggestions[0].sourceDisplay, 'Main p. 4');

    assert.equal(suggestions[1].sourceType, 'located');
    assert.equal(suggestions[1].sourceDisplay, 'ATC p. 11');

    assert.equal(suggestions[2].sourceType, 'rule');
    assert.equal(suggestions[2].sourceDisplay, 'rule (rule)');
});

test('preselect nothing: infosheet suggestions are NEVER auto-preselected', () => {
    const suggestions = extractInfosheetSuggestions(MORENA_STORED_FIELDS);
    assert.ok(suggestions.length > 0);

    // Initial selected documents for a new checklist
    const currentSelected: string[] = [];

    // computeAutoPreselectedDocuments is only ever passed AI requirements (biddingRequirements)
    // and is never fed infosheet suggestions. Even if passed empty or null requirements,
    // currentSelected remains 100% empty.
    const result = computeAutoPreselectedDocuments({
        currentSelected,
        requirements: null,
        mode: 'create',
    });

    assert.equal(result.updated, false);
    assert.deepEqual(result.selectedDocuments, []);
});

test('clean read-only extraction: empty or missing fields produce zero suggestions and make no Claude calls', () => {
    assert.deepEqual(extractInfosheetSuggestions(null), []);
    assert.deepEqual(extractInfosheetSuggestions(undefined), []);
    assert.deepEqual(extractInfosheetSuggestions({}), []);
    assert.deepEqual(
        extractInfosheetSuggestions({
            doc1: { value: 'NA' },
            doc2: { value: 'none' },
            doc3: { value: null },
            requiredDocuments: { value: [] },
        }),
        []
    );
});
