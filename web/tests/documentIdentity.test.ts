// Run with: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    getIdentityMismatchBanner,
    type DocumentIdentityCheck,
} from '../src/modules/tendering/info-sheet/helpers/documentIdentity.ts';

const NOIDA = 'GEM/2025/B/7017046';
const MORENA = 'GEM/2025/B/7021103';

function check(overrides: Partial<DocumentIdentityCheck>): DocumentIdentityCheck {
    return {
        mainDocumentNumber: null,
        atcDocumentNumber: null,
        match: null,
        status: 'unverifiable',
        basis: null,
        mainNumbersFound: {},
        atcNumbersFound: {},
        ...overrides,
    };
}

test('(a) matching numbers -> no banner', () => {
    const c = check({ mainDocumentNumber: MORENA, atcDocumentNumber: MORENA, match: true, status: 'match', basis: 'gem_bid_number' });
    assert.equal(getIdentityMismatchBanner(c), null);
});

test('(b) Noida main vs Morena ATC -> banner with both numbers', () => {
    const c = check({ mainDocumentNumber: NOIDA, atcDocumentNumber: MORENA, match: false, status: 'mismatch', basis: 'gem_bid_number' });
    assert.deepEqual(getIdentityMismatchBanner(c), { mainDocumentNumber: NOIDA, atcDocumentNumber: MORENA });
});

test('(c) ATC with no extractable number -> match null -> no false-positive banner', () => {
    const c = check({ mainDocumentNumber: NOIDA, atcDocumentNumber: null, match: null, status: 'unverifiable' });
    assert.equal(getIdentityMismatchBanner(c), null);
});

test('no ATC, same document, or missing check -> no banner', () => {
    assert.equal(getIdentityMismatchBanner(check({ mainDocumentNumber: NOIDA, status: 'no_atc' })), null);
    assert.equal(getIdentityMismatchBanner(check({ mainDocumentNumber: NOIDA, status: 'same_document' })), null);
    assert.equal(getIdentityMismatchBanner(null), null);
    assert.equal(getIdentityMismatchBanner(undefined), null);
});
