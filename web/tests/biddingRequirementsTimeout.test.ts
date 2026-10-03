// Run with: npm run test:unit
//
// Fix 1 -- the bidding-requirements analysis gets its own long timeout; every other
// request keeps the global 30s axios default. At 30s the browser gave up on a request
// that genuinely takes 80-100s+, while the API kept running it, so the user's retry
// started a second paid analysis.
//
// Uses the REAL documentChecklistService and axiosInstance against a local HTTP server
// (no mocked axios). To keep the suite fast, the "slow" delay and the instance default
// are scaled down together: the per-request override is independent of the default's
// value, so "override outlasts a delay the default cannot" is the property under test.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { register } from 'node:module';
import type { AddressInfo } from 'node:net';

register('./helpers/vite-env-loader.mjs', import.meta.url);

// Logged-in session so the request interceptor does not block non-public paths.
const store = new Map<string, string>([['tms_auth_user', JSON.stringify({ id: 1, name: 'Test User' })]]);
(globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
};

const { default: axiosInstance } = await import('../src/lib/axios.ts');
const { documentChecklistService, BIDDING_REQUIREMENTS_REQUEST_TIMEOUT_MS } = await import(
    '../src/services/api/document-checklist.service.ts'
);

const DELAY_MS = 600; // stands in for the real ~90s analysis
let server: http.Server;
let requestedPaths: string[] = [];

before(async () => {
    server = http.createServer((req, res) => {
        requestedPaths.push(req.url ?? '');
        setTimeout(() => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ jobId: 'breq_slow', requirements: [], llmUsage: null, schemaVersion: 1, annexures: [] }));
        }, DELAY_MS);
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    axiosInstance.defaults.baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
});

after(() => server.close());

test('the global axios timeout is still 30s (not raised for every request)', () => {
    assert.equal(axiosInstance.defaults.timeout, 30000);
});

test('the bidding-requirements override is at least 180s and outlasts the API wait for VolksAI (240s)', () => {
    assert.ok(BIDDING_REQUIREMENTS_REQUEST_TIMEOUT_MS >= 180_000);
    assert.ok(BIDDING_REQUIREMENTS_REQUEST_TIMEOUT_MS > 240_000);
});

test('getSuggestedRequirements sends its own timeout on the request config', async () => {
    const original = axiosInstance.get;
    let seenConfig: any;
    (axiosInstance as any).get = async (url: string, config?: any) => {
        seenConfig = config;
        return { data: { jobId: 'x', requirements: [] } };
    };
    try {
        await documentChecklistService.getSuggestedRequirements(1175);
    } finally {
        (axiosInstance as any).get = original;
    }
    assert.equal(seenConfig?.timeout, BIDDING_REQUIREMENTS_REQUEST_TIMEOUT_MS);
});

test('a slow analysis response does not abort, while other calls still use the default timeout', async () => {
    const originalDefault = axiosInstance.defaults.timeout;
    axiosInstance.defaults.timeout = DELAY_MS / 3; // default now shorter than the response delay
    try {
        requestedPaths = [];
        // Real service call through the real axios instance: must succeed despite the delay.
        const result = await documentChecklistService.getSuggestedRequirements(1175);
        assert.equal(result.jobId, 'breq_slow');

        // Any other request on the same instance still gets the (short) default and aborts.
        await assert.rejects(
            axiosInstance.get('/document-checklists/dashboard'),
            (err: any) => err?.code === 'ECONNABORTED',
        );
        assert.ok(requestedPaths.includes('/api/v1/document-checklists/tender/1175/bidding-requirements'));
    } finally {
        axiosInstance.defaults.timeout = originalDefault;
    }
});
