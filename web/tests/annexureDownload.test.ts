// Run with: npm run test:unit
//
// "Annexures & Forms" section on the document checklist page: one row per identified
// annexure, each with its own Download that requests only that annexure's index; no rows
// (so no section) when the analysis has none.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { register } from 'node:module';
import type { AddressInfo } from 'node:net';

import { buildAnnexureRows } from '../src/modules/tendering/checklists/helpers/annexureRows.ts';

register('./helpers/vite-env-loader.mjs', import.meta.url);

const store = new Map<string, string>([['tms_auth_user', JSON.stringify({ id: 1, name: 'Test User' })]]);
(globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
};

const { default: axiosInstance } = await import('../src/lib/axios.ts');
const { documentChecklistService } = await import('../src/services/api/document-checklist.service.ts');

const analysis = (annexures: unknown[] | undefined) =>
    ({ jobId: 'j', requirements: [], llmUsage: null, annexures }) as any;

const TWO = analysis([
    { annexureName: 'Annexure A - Bid Form', source: { document: 'main', page: 5, snippet: 'Format of bid' } },
    { annexureName: 'Annexure B - Undertaking', source: { document: 'atc', page: 9, snippet: 'Undertaking format' } },
]);

test('2 annexures -> 2 rows with distinct indices, names and citations', () => {
    const rows = buildAnnexureRows(TWO);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map((r) => r.index), [0, 1]);
    assert.deepEqual(rows.map((r) => r.name), ['Annexure A - Bid Form', 'Annexure B - Undertaking']);
    assert.equal(rows[0].citation, 'Main p.5: "Format of bid"');
    assert.equal(rows[1].citation, 'ATC p.9: "Undertaking format"');
});

test('empty, missing or absent annexures -> no rows (section not rendered)', () => {
    assert.deepEqual(buildAnnexureRows(analysis([])), []);
    assert.deepEqual(buildAnnexureRows(analysis(undefined)), []);
    assert.deepEqual(buildAnnexureRows(null), []);
});

let server: http.Server;
let hits: string[] = [];

before(async () => {
    server = http.createServer((req, res) => {
        hits.push(req.url ?? '');
        res.writeHead(200, {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': 'attachment; filename="tender7_Annexure-B.docx"',
        });
        res.end(Buffer.from('docx-bytes'));
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    axiosInstance.defaults.baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
});

after(() => server.close());

test('download requests only the clicked annexure index and returns blob + server filename', async () => {
    hits = [];
    const rows = buildAnnexureRows(TWO);
    const { blob, filename } = await documentChecklistService.downloadAnnexure(7, rows[1].index);
    assert.deepEqual(hits, ['/api/v1/document-checklists/tender/7/annexures/1/download']);
    assert.equal(filename, 'tender7_Annexure-B.docx');
    // axios yields a Buffer under Node's http adapter (a Blob in the browser).
    assert.equal(Buffer.from(blob as unknown as ArrayBuffer).toString(), 'docx-bytes');
});
