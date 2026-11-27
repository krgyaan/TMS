// Run with: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { calculateMaxLdDate } from '../src/modules/operations/wo-details/helpers/ldDate.ts';

test('calculates Max LD Date from weekly LD and max LD percentage', () => {
    // 10% max / 0.5% per week = 20 weeks = 140 days
    assert.equal(calculateMaxLdDate('2026-01-01', 10, 0.5), '2026-05-21');
});

test('rounds up partial weeks to include the final day', () => {
    // 5% max / 1.5% per week = 3.33 weeks = 23.33 days -> 24 days
    assert.equal(calculateMaxLdDate('2026-01-01', 5, 1.5), '2026-01-25');
});

test('accepts numeric strings from the API', () => {
    assert.equal(calculateMaxLdDate('2026-01-01', '10.00', '0.50'), '2026-05-21');
});

test('ignores any time component on the start date', () => {
    assert.equal(calculateMaxLdDate('2026-01-01T00:00:00.000Z', 10, 0.5), '2026-05-21');
});

test('returns an empty string when inputs are missing or invalid', () => {
    assert.equal(calculateMaxLdDate('', 10, 0.5), '');
    assert.equal(calculateMaxLdDate(null, 10, 0.5), '');
    assert.equal(calculateMaxLdDate('2026-01-01', null, 0.5), '');
    assert.equal(calculateMaxLdDate('2026-01-01', 10, null), '');
    assert.equal(calculateMaxLdDate('2026-01-01', 0, 0.5), '');
    assert.equal(calculateMaxLdDate('2026-01-01', 10, 0), '');
    assert.equal(calculateMaxLdDate('not-a-date', 10, 0.5), '');
});
