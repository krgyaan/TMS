// Run with: npm run test:unit
//
// Phase 1C -- Async Job Polling & Timeout Prevention
//
// In Phase 1C, the analyze endpoint is changed from a long-lived GET to an asynchronous
// POST that returns immediately with a job row (pending/running/done/failed).
// The frontend polls the status endpoint until done or failed.
// Because each HTTP request completes in <1s, no proxy or browser timeouts occur.
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

let server: http.Server;
let requestedPaths: string[] = [];
let statusPollCount = 0;

const COMPLETED_ANALYSIS = {
    jobId: 'breq_job_done',
    requirements: [
        {
            documentName: 'PAN & GST',
            category: 'standard',
            required: true,
            source: { document: 'atc', page: 2, snippet: 'PAN and GST required' },
            matchedLibraryId: 'std:pan_gst',
            confidence: 'high',
            reasoning: 'Standard statutory document',
        },
    ],
    llmUsage: null,
    schemaVersion: 1,
    annexures: [],
    rejectedAnnexures: [],
    truncated: false,
};

before(async () => {
    server = http.createServer((req, res) => {
        requestedPaths.push(req.url ?? '');
        res.writeHead(200, { 'Content-Type': 'application/json' });

        if ((req.url ?? '').includes('/bidding-requirements/status')) {
            statusPollCount++;
            if (statusPollCount < 2) {
                // First poll: still running
                res.end(JSON.stringify({
                    jobId: 101,
                    tenderId: 1175,
                    status: 'running',
                    documentHash: 'hash101',
                    analysis: null,
                    error: null,
                }));
            } else {
                // Second poll: completed
                res.end(JSON.stringify({
                    jobId: 101,
                    tenderId: 1175,
                    status: 'done',
                    documentHash: 'hash101',
                    analysis: COMPLETED_ANALYSIS,
                    error: null,
                }));
            }
        } else {
            // POST /tender/1175/bidding-requirements returns pending immediately
            res.end(JSON.stringify({
                jobId: 101,
                tenderId: 1175,
                status: 'pending',
                documentHash: 'hash101',
                analysis: null,
                error: null,
            }));
        }
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    axiosInstance.defaults.baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
});

after(() => server.close());

test('the global axios timeout is 30s (not raised globally for standard requests)', () => {
    assert.equal(axiosInstance.defaults.timeout, 30000);
});

test('startSuggestedRequirements returns immediately with pending job status via POST', async () => {
    requestedPaths = [];
    const status = await documentChecklistService.startSuggestedRequirements(1175);
    assert.equal(status.jobId, 101);
    assert.equal(status.status, 'pending');
    assert.ok(requestedPaths.some((p) => p.includes('/tender/1175/bidding-requirements')));
});

test('getSuggestedRequirements polls until job status is done without long HTTP request', async () => {
    statusPollCount = 0;
    requestedPaths = [];

    const result = await documentChecklistService.getSuggestedRequirements(1175, false, {
        pollIntervalMs: 50,
        maxWaitMs: 5000,
    });

    assert.equal(result.jobId, 'breq_job_done');
    assert.equal(result.requirements.length, 1);
    assert.equal(result.requirements[0].documentName, 'PAN & GST');

    // Verified that polling occurred
    assert.ok(statusPollCount >= 2);
    assert.ok(requestedPaths.some((p) => p.includes('/bidding-requirements/status')));
});

test('getSuggestedRequirements aborts polling immediately when AbortSignal is triggered', async () => {
    const controller = new AbortController();
    // Trigger abort shortly after starting
    setTimeout(() => controller.abort(), 20);

    await assert.rejects(
        documentChecklistService.getSuggestedRequirements(1175, false, {
            signal: controller.signal,
            pollIntervalMs: 200,
            maxWaitMs: 5000,
        }),
        (err: any) => err?.name === 'AbortError',
    );
});
