// Run with: npm run test:unit
//
// Fix 2 -- a completed bidding-requirements analysis is visible on page load, read from
// the API's cache-only endpoint (which never runs VolksAI). "Analyze Tender Documents" is
// offered only when nothing is cached; forcing a new run is a separate "Re-analyze".
//
// The "zero VolksAI calls" guarantee itself is enforced and tested in the API
// (bidding-requirements.service.spec.ts, getCachedAnalysis). Here: the page-load read
// only ever hits the /cached route, and the panel shows the cached result straight away.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { register } from 'node:module';
import type { AddressInfo } from 'node:net';

import { resolveSuggestionPanel } from '../src/modules/tendering/checklists/helpers/suggestionPanel.ts';

register('./helpers/vite-env-loader.mjs', import.meta.url);

const store = new Map<string, string>([['tms_auth_user', JSON.stringify({ id: 1, name: 'Test User' })]]);
(globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
};

const { default: axiosInstance } = await import('../src/lib/axios.ts');
const { documentChecklistService } = await import('../src/services/api/document-checklist.service.ts');

const CACHED = {
    jobId: 'breq_cached_kochi',
    requirements: [
        {
            documentName: 'OEM Authorization Certificate',
            category: 'oem',
            required: true,
            source: { document: 'atc', page: 12, snippet: 'OEM authorization required' },
            matchedLibraryId: null,
            confidence: 'high',
            reasoning: 'Explicit BEC requirement',
        },
    ],
    llmUsage: null,
} as any;

// ── Panel state ─────────────────────────────────────────────────────────────

test('cached analysis on load: shown immediately, only "Re-analyze" offered', () => {
    const s = resolveSuggestionPanel({ cached: CACHED, cacheLoading: false, fresh: undefined, analyzing: false });
    assert.equal(s.analysis, CACHED);
    assert.equal(s.showAnalyze, false);
    assert.equal(s.showReanalyze, true);
    assert.equal(s.checkingCache, false);
});

test('never analysed: "Analyze Tender Documents" offered, nothing shown', () => {
    const s = resolveSuggestionPanel({ cached: null, cacheLoading: false, fresh: undefined, analyzing: false });
    assert.equal(s.analysis, null);
    assert.equal(s.showAnalyze, true);
    assert.equal(s.showReanalyze, false);
});

test('while the cache read is in flight: no button yet (no premature paid analysis)', () => {
    const s = resolveSuggestionPanel({ cached: undefined, cacheLoading: true, fresh: undefined, analyzing: false });
    assert.equal(s.checkingCache, true);
    assert.equal(s.showAnalyze, false);
    assert.equal(s.showReanalyze, false);
});

test('a run from this session replaces the cached result; no buttons while analysing', () => {
    const fresh = { ...CACHED, jobId: 'breq_fresh' };
    assert.equal(resolveSuggestionPanel({ cached: CACHED, cacheLoading: false, fresh, analyzing: false }).analysis, fresh);
    const busy = resolveSuggestionPanel({ cached: CACHED, cacheLoading: false, fresh: undefined, analyzing: true });
    assert.equal(busy.showAnalyze, false);
    assert.equal(busy.showReanalyze, false);
});

// ── Service calls against a local API stand-in ──────────────────────────────

let server: http.Server;
let hits: string[] = [];
let cachedPayload: unknown = { analysis: CACHED };

before(async () => {
    server = http.createServer((req, res) => {
        hits.push(req.url ?? '');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if ((req.url ?? '').endsWith('/bidding-requirements/cached')) {
            res.end(JSON.stringify(cachedPayload));
        } else {
            res.end(JSON.stringify({ ...CACHED, jobId: 'breq_new_run' }));
        }
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    axiosInstance.defaults.baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
});

after(() => server.close());

test('page-load read hits only the cache-only route and returns the cached analysis', async () => {
    hits = [];
    cachedPayload = { analysis: CACHED };
    const result = await documentChecklistService.getCachedRequirements(1175);
    assert.equal(result?.jobId, 'breq_cached_kochi');
    assert.deepEqual(hits, ['/api/v1/document-checklists/tender/1175/bidding-requirements/cached']);
});

test('page-load read of a never-analysed tender returns null (and still only hits /cached)', async () => {
    hits = [];
    cachedPayload = { analysis: null };
    assert.equal(await documentChecklistService.getCachedRequirements(1175), null);
    assert.deepEqual(hits, ['/api/v1/document-checklists/tender/1175/bidding-requirements/cached']);
});

test('"Analyze" uses the normal endpoint; "Re-analyze" sends forceRefresh=true', async () => {
    hits = [];
    await documentChecklistService.getSuggestedRequirements(1175);
    await documentChecklistService.getSuggestedRequirements(1175, true);
    assert.deepEqual(hits, [
        '/api/v1/document-checklists/tender/1175/bidding-requirements',
        '/api/v1/document-checklists/tender/1175/bidding-requirements?forceRefresh=true',
    ]);
});
