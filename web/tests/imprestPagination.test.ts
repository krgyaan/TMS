/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./helpers/vite-env-loader.mjs', import.meta.url);
register('./helpers/tsx-loader.mjs', import.meta.url);

const { getImprestPaginationMeta } = await import('../src/modules/imprest/imprestPagination.ts');

test('mobile imprest pagination metadata clamps to valid page bounds', () => {
    const firstPage = getImprestPaginationMeta({ pageIndex: 0, pageSize: 10, totalRows: 25 });
    assert.deepEqual(firstPage, {
        currentPage: 1,
        totalPages: 3,
        hasPrev: false,
        hasNext: true,
    });

    const lastPage = getImprestPaginationMeta({ pageIndex: 2, pageSize: 10, totalRows: 25 });
    assert.deepEqual(lastPage, {
        currentPage: 3,
        totalPages: 3,
        hasPrev: true,
        hasNext: false,
    });

    const outOfRangePage = getImprestPaginationMeta({ pageIndex: 99, pageSize: 10, totalRows: 25 });
    assert.deepEqual(outOfRangePage, {
        currentPage: 3,
        totalPages: 3,
        hasPrev: true,
        hasNext: false,
    });
});
