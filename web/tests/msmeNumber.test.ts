// Run with: npm run test:unit   (node --test "tests/*.test.ts", Node >= 22.18 strips TS types natively)
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isRealMsmeNumber } from '../src/modules/master/vendor-master/helpers/msme.ts';

test('real MSME numbers are recognised', () => {
    assert.equal(isRealMsmeNumber('UDYAM-DL-09-0000465'), true);
    assert.equal(isRealMsmeNumber('  udyam-dl-09-0000465  '), true);
    // Matches the regex even though it is also used as the input placeholder.
    assert.equal(isRealMsmeNumber('UDYAM-XX-00-0000000'), true);
});

test('blank values are not real MSME numbers', () => {
    assert.equal(isRealMsmeNumber(''), false);
    assert.equal(isRealMsmeNumber('   '), false);
    assert.equal(isRealMsmeNumber(null), false);
    assert.equal(isRealMsmeNumber(undefined), false);
});

test('placeholder values are not real MSME numbers', () => {
    for (const value of ['unknown', 'NA', 'N/A', 'N.A.', 'Not Applicable', 'NOT ACP', '-', '--', 'none', 'NON-MSME', 'NON MSME']) {
        assert.equal(isRealMsmeNumber(value), false, `expected "${value}" to be treated as non-real`);
    }
});

test('malformed Udyam-like values are not real MSME numbers', () => {
    for (const value of [
        'UDYAM-D-09-0000465', // one-letter state code
        'UDYAM-DL-9-0000465', // one-digit district
        'UDYAM-DL-09-000465', // six-digit serial
        'UDYAM-DL-09-00004650', // eight-digit serial
        'UDYAMDL090000465', // missing separators
        'XUDYAM-DL-09-0000465', // wrong prefix
        'UDYAM-DL-09-0000465X', // trailing character
        'UDYAM DL 09 0000465', // spaces instead of hyphens
        'UDYAM-DL-09-0000465 extra',
    ]) {
        assert.equal(isRealMsmeNumber(value), false, `expected "${value}" to be treated as non-real`);
    }
});
