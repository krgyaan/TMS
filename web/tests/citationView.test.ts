// Run with: npm run test:unit   (node --test "tests/*.test.ts", Node >= 22.18 strips TS types natively)
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isCitationLocated, resolveCitationView, type FieldSources } from '../src/components/form/citationView.ts';

const base: FieldSources = { self_classified_atc: false, has_conflict: false, main_tender: null, atc: null };

test('stale snapshot: value changed after extraction renders as unverified, never with a page', () => {
    // Shape the API returns for Noida's orderValue1: Layer-1 snapshot said
    // "Not Applicable" (page 5), the LLM later wrote "Rs. 61.00 Lac".
    const sources: FieldSources = {
        ...base,
        located: false,
        unlocated: {
            value: 'Rs. 61.00 Lac',
            raw_value: 'Rs. 61.00 Lac',
            page: null,
            snippet: null,
            located: false,
            unlocated_reason: 'value_changed_after_extraction',
            document: null,
        },
    };
    const view = resolveCitationView({ sources, source: 'llm', type: 'fallback' });
    assert.equal(view.kind, 'unverified');
    assert.ok(view.kind === 'unverified');
    assert.equal(view.reason, 'value_changed_after_extraction');
    assert.equal(view.origin, 'ai');
    assert.equal(view.snippet, null);
});

test('genuine matched citation still renders as a located page citation', () => {
    const sources: FieldSources = {
        ...base,
        located: true,
        main_tender: {
            value: 1000000,
            raw_value: 'Rs. 10,00,000',
            page: 2,
            snippet: 'Estimated Tender Value: Rs. 10,00,000',
            located: true,
            unlocated_reason: null,
        },
    };
    const view = resolveCitationView({ sources, source: 'regex', type: 'high' });
    assert.equal(view.kind, 'located');
    assert.ok(view.kind === 'located');
    assert.equal(view.document, 'main_tender');
    assert.equal(view.citation.page, 2);
});

test('no snapshot data at all renders as unverified, never as a fabricated page 1', () => {
    const sources: FieldSources = {
        ...base,
        located: false,
        unlocated: {
            value: 90,
            raw_value: '90',
            page: null,
            snippet: null,
            located: false,
            unlocated_reason: 'no_source_record',
            document: 'main_tender',
        },
    };
    const view = resolveCitationView({ sources, source: 'regex', type: 'high' });
    assert.equal(view.kind, 'unverified');
    assert.ok(view.kind === 'unverified');
    assert.equal(view.reason, 'no_source_record');
    assert.equal(view.origin, 'main_tender');
});

test('legacy saved extraction with fabricated "page 1, empty snippet" is not shown as located', () => {
    // Saved before the `located` flag existed: indistinguishable from the old fabrication.
    const sources: FieldSources = {
        ...base,
        main_tender: { value: 'Rs. 61.00 Lac', raw_value: 'Rs. 61.00 Lac', page: 1, snippet: '' },
    };
    assert.equal(isCitationLocated(sources.main_tender), false);
    const view = resolveCitationView({ sources, source: 'llm', type: 'fallback' });
    assert.equal(view.kind, 'unverified');
});

test('legacy saved citation with a real page and snippet is still located', () => {
    const citation = { value: 5, raw_value: '5%', page: 14, snippet: 'ePBG Percentage(%) 5.00' };
    assert.equal(isCitationLocated(citation), true);
});

test('matching text with no recorded page is unverified but keeps the matched text', () => {
    const sources: FieldSources = {
        ...base,
        main_tender: {
            value: 'Yes',
            raw_value: 'Yes',
            page: null,
            snippet: 'OEM Authorization Certificate',
            located: false,
            unlocated_reason: 'no_page_recorded',
        },
    };
    const view = resolveCitationView({ sources, source: 'regex', type: 'high' });
    assert.ok(view.kind === 'unverified');
    assert.equal(view.reason, 'no_page_recorded');
    assert.equal(view.snippet, 'OEM Authorization Certificate');
    assert.equal(view.origin, 'main_tender');
});

test('conflict keeps both sides but only marks pages for located ones', () => {
    const sources: FieldSources = {
        ...base,
        has_conflict: true,
        main_tender: { value: 100000, raw_value: 'Rs. 1,00,000', page: 3, snippet: 'EMD: Rs. 1,00,000', located: true },
        atc: { value: 50000, raw_value: 'Rs. 50,000', page: null, snippet: 'Revised EMD', located: false, unlocated_reason: 'no_page_recorded' },
    };
    const view = resolveCitationView({ sources, source: 'atc', type: 'high' });
    assert.ok(view.kind === 'conflict');
    assert.equal(view.mainLocated, true);
    assert.equal(view.atcLocated, false);
});

test('missing field with no sources stays in the missing state', () => {
    const view = resolveCitationView({ sources: base, source: null, type: 'missing', isLlmField: true });
    assert.equal(view.kind, 'missing');
});
