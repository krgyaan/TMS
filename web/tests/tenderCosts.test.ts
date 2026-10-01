/// <reference types="node" />
// Run with: npm run test:unit
//
// Tender Token & Cost Breakdown page (/system-health/tender-costs) and the navigation link
// that replaced the inline table in ClaudeTelemetrySection. The real .tsx components are
// compiled by tests/helpers/tsx-loader.mjs and server-rendered (react-dom/server) for the
// markup checks; the sort-tab test drives the real page through a minimal hook harness so a
// real click handler -> state -> useQuery -> healthService -> HTTP request chain is exercised.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { register } from 'node:module';
import type { AddressInfo } from 'node:net';

register('./helpers/vite-env-loader.mjs', import.meta.url);
register('./helpers/tsx-loader.mjs', import.meta.url);

const store = new Map<string, string>([['tms_auth_user', JSON.stringify({ id: 1, name: 'Test User' })]]);
(globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
};

const React = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { MemoryRouter } = await import('react-router-dom');
const { QueryClient, QueryClientProvider, QueryClientContext } = await import('@tanstack/react-query');
const { default: axiosInstance } = await import('../src/lib/axios.ts');
const { healthKey } = await import('../src/hooks/api/useHealth.ts');
const { paths } = await import('../src/app/routes/paths.ts');
const { default: TenderCostsPage } = await import('../src/modules/system-health/TenderCostsPage.tsx');
const { ClaudeTelemetrySection } = await import('../src/modules/system-health/components/ClaudeTelemetrySection.tsx');

const tender = (over: Record<string, unknown>) => ({
    tenderId: 1,
    tenderName: null,
    tenderNo: null,
    totalTokens: 1000,
    estimatedCostUsd: 0.01,
    estimatedCostInr: 0.95,
    totalCalls: 1,
    lastActiveAt: new Date().toISOString(),
    calls: [],
    ...over,
});

const ROWS = [
    tender({ tenderId: 42, tenderName: 'GAIL Noida SMF', tenderNo: 'GEM/2026/B/7899053' }),
    tender({ tenderId: 3633, tenderName: null, tenderNo: null }),
    tender({ tenderId: 7, tenderName: 'GAIL Noida SMF', tenderNo: null }),
];

function renderWith(element: unknown, seed?: (qc: InstanceType<typeof QueryClient>) => void): string {
    const qc = new QueryClient();
    seed?.(qc);
    return renderToStaticMarkup(
        React.createElement(QueryClientProvider, { client: qc }, React.createElement(MemoryRouter, null, element as any)),
    );
}

const pageHtml = renderWith(React.createElement(TenderCostsPage), (qc) => qc.setQueryData(healthKey.claudeTenders('cost'), ROWS));

/** The <tr> of the main table that renders the given tender's identity cell and actions. */
function rowFor(tenderId: number): string {
    const rows = pageHtml.split('<tr').slice(1).map((r) => '<tr' + r.slice(0, r.indexOf('</tr>')));
    const row = rows.find((r) => r.includes(`/info-sheet/edit/${tenderId}"`));
    if (!row) throw new Error(`no table row rendered for tender ${tenderId}`);
    return row;
}

/** Text of the Tender cell: primary (font-semibold) and secondary (muted) lines. */
function identityCell(tenderId: number): { primary: string | null; secondary: string[]; text: string } {
    const row = rowFor(tenderId);
    const cell = row.match(/<td[^>]*max-w-\[280px\][^>]*>(.*?)<\/td>/)?.[1] ?? '';
    const primary = cell.match(/<span class="[^"]*font-semibold[^"]*">(.*?)<\/span>/)?.[1] ?? null;
    const secondary = [...cell.matchAll(/<span class="[^"]*text-muted-foreground[^"]*">(.*?)<\/span>/g)].map((m) => m[1]);
    return { primary, secondary, text: cell.replace(/<[^>]+>/g, '') };
}

// ── TEST 4: name / number / fallback display ───────────────────────────────

test('TEST 4a: tender name is the primary text and tender number the secondary text', () => {
    const cell = identityCell(42);
    assert.equal(cell.primary, 'GAIL Noida SMF');
    assert.deepEqual(cell.secondary, ['GEM/2026/B/7899053']);
});

test('TEST 4b: no name and no number falls back to "Tender #<id>", never a blank cell', () => {
    const cell = identityCell(3633);
    assert.equal(cell.primary, 'Tender #3633');
    assert.notEqual(cell.text.trim(), '');
});

test('TEST 4c: name without a number shows the name and never the text "null"/"undefined"', () => {
    const cell = identityCell(7);
    assert.equal(cell.primary, 'GAIL Noida SMF');
    assert.doesNotMatch(cell.text, /null|undefined/i);
});

test('TEST 4c (strict): name without a number shows name as primary and tender id as secondary', () => {
    const cell = identityCell(7);
    assert.equal(cell.primary, 'GAIL Noida SMF');
    assert.deepEqual(cell.secondary, ['#7']);
});

// ── TEST 5: View Info Sheet link ────────────────────────────────────────────

test('TEST 5: View Info Sheet links by tender id (not by name)', () => {
    const href = rowFor(42).match(/<a[^>]*href="([^"]+)"[^>]*>View Info Sheet/)?.[1];
    assert.equal(href, paths.tendering.infoSheetEdit(42));
    assert.equal(href, '/tendering/info-sheet/edit/42');
    assert.doesNotMatch(href!, /GAIL|Noida|%20/);
});

// ── TEST 6: ClaudeTelemetrySection shows a link, not the table ──────────────

test('TEST 6: ClaudeTelemetrySection links to /system-health/tender-costs and no longer renders the tender table', () => {
    const html = renderWith(React.createElement(ClaudeTelemetrySection));
    assert.equal(paths.system.tenderCosts, '/system-health/tender-costs');
    assert.match(html, /<a[^>]*href="\/system-health\/tender-costs"[^>]*>View full tender cost breakdown/);
    // The removed inline table: its sort tabs, its column headers and its per-row action link.
    assert.doesNotMatch(html, /Sort by:/);
    assert.doesNotMatch(html, />Calls Count</);
    assert.doesNotMatch(html, />Last Extracted</);
    assert.doesNotMatch(html, /View Info Sheet/);
    assert.doesNotMatch(html, /\/info-sheet\/edit\//);
});

// ── TEST 7: sort tabs request the matching sortBy ───────────────────────────

/**
 * Minimal hook harness: calls a function component with a custom React dispatcher so its
 * hooks run (state, context, effects, external-store subscriptions) without a DOM. Returns
 * the element tree from the latest render so tests can invoke real onClick handlers.
 */
function mount(Component: () => unknown, contexts: Map<unknown, unknown>) {
    const internals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    const slots: any[] = [];
    const cleanups = new Map<number, () => void>();
    let dirty = false;
    let tree: unknown;

    const depsChanged = (prev: unknown[] | undefined, next: unknown[] | undefined) =>
        !prev || !next || prev.length !== next.length || prev.some((d, i) => !Object.is(d, next[i]));

    function render() {
        let i = 0;
        const effects: Array<() => void> = [];
        const dispatcher = {
            useState(init: unknown) {
                const idx = i++;
                if (!(idx in slots)) slots[idx] = { value: typeof init === 'function' ? (init as () => unknown)() : init };
                const slot = slots[idx];
                const set = (v: unknown) => {
                    const nextVal = typeof v === 'function' ? (v as (p: unknown) => unknown)(slot.value) : v;
                    if (!Object.is(nextVal, slot.value)) { slot.value = nextVal; dirty = true; }
                };
                return [slot.value, set];
            },
            useReducer(reducer: (s: unknown, a: unknown) => unknown, initArg: unknown, init?: (a: unknown) => unknown) {
                const [s, set] = dispatcher.useState(() => (init ? init(initArg) : initArg)) as [unknown, (v: unknown) => void];
                return [s, (a: unknown) => set((prev: unknown) => reducer(prev, a))];
            },
            useRef(init: unknown) {
                const idx = i++;
                if (!(idx in slots)) slots[idx] = { current: init };
                return slots[idx];
            },
            useMemo(fn: () => unknown, deps?: unknown[]) {
                const idx = i++;
                if (!(idx in slots) || depsChanged(slots[idx].deps, deps)) slots[idx] = { value: fn(), deps };
                return slots[idx].value;
            },
            useCallback(fn: unknown, deps?: unknown[]) {
                return dispatcher.useMemo(() => fn, deps);
            },
            useContext(ctx: any) {
                return contexts.has(ctx) ? contexts.get(ctx) : ctx._currentValue;
            },
            useEffect(fn: () => void | (() => void), deps?: unknown[]) {
                const idx = i++;
                if (!(idx in slots) || depsChanged(slots[idx].deps, deps)) {
                    slots[idx] = { deps };
                    effects.push(() => {
                        cleanups.get(idx)?.();
                        const c = fn();
                        if (typeof c === 'function') cleanups.set(idx, c); else cleanups.delete(idx);
                    });
                }
            },
            useLayoutEffect(fn: () => void | (() => void), deps?: unknown[]) { dispatcher.useEffect(fn, deps); },
            useInsertionEffect(fn: () => void | (() => void), deps?: unknown[]) { dispatcher.useEffect(fn, deps); },
            useSyncExternalStore(subscribe: (cb: () => void) => () => void, getSnapshot: () => unknown) {
                const idx = i++;
                if (!(idx in slots) || slots[idx].subscribe !== subscribe) {
                    slots[idx]?.unsubscribe?.();
                    slots[idx] = { subscribe };
                    effects.push(() => { slots[idx].unsubscribe = subscribe(() => { dirty = true; }); });
                    cleanups.set(-1 - idx, () => slots[idx].unsubscribe?.());
                }
                return getSnapshot();
            },
            useId() { const idx = i++; return (slots[idx] ??= { id: `:h${idx}:` }).id; },
            useDebugValue() {},
            useTransition() { return [false, (fn: () => void) => fn()]; },
            useDeferredValue(v: unknown) { return v; },
        };
        const prev = internals.H;
        internals.H = dispatcher;
        try { tree = Component(); } finally { internals.H = prev; }
        dirty = false;
        for (const e of effects) e();
    }

    render();
    return {
        get tree() { return tree; },
        /** Re-render until state settles (a click or a store notification marks it dirty). */
        flush() { for (let n = 0; dirty && n < 10; n++) render(); },
        unmount() { for (const c of cleanups.values()) c(); cleanups.clear(); },
    };
}

/** Finds the element whose (text) children equal `label` and that has an onClick handler. */
function findClickable(node: any, label: string): any {
    if (node == null || typeof node !== 'object') return null;
    if (Array.isArray(node)) {
        for (const n of node) { const f = findClickable(n, label); if (f) return f; }
        return null;
    }
    const props = node.props ?? {};
    if (typeof props.onClick === 'function' && props.children === label) return node;
    return findClickable(props.children, label);
}

let server: http.Server;
let hits: string[] = [];

before(async () => {
    server = http.createServer((req: any, res: any) => {
        hits.push(req.url ?? '');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('[]');
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    axiosInstance.defaults.baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
});

after(() => server.close());

async function waitForHit(pattern: RegExp): Promise<string> {
    for (let n = 0; n < 100; n++) {
        const hit = hits.find((h) => pattern.test(h));
        if (hit) return hit;
        await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error(`no request matching ${pattern}; saw ${JSON.stringify(hits)}`);
}

test('TEST 7: Cost/Tokens/Recent tabs each request /health/claude/tenders with the matching sortBy', async () => {
    hits = [];
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const page = mount(TenderCostsPage as () => unknown, new Map([[QueryClientContext, qc]]));
    try {
        // Initial render: default tab is Cost.
        assert.equal(await waitForHit(/sortBy=cost/), '/api/v1/health/claude/tenders?sortBy=cost');

        for (const [label, sortBy] of [['Tokens', 'tokens'], ['Recent', 'recent'], ['Cost', 'cost']] as const) {
            const before = hits.length;
            const tab = findClickable(page.tree, label);
            assert.ok(tab, `no clickable "${label}" sort tab rendered`);
            tab.props.onClick();
            page.flush();
            // The clicked tab is now the selected (secondary) variant; the others are ghost.
            assert.equal(findClickable(page.tree, label).props.variant, 'secondary');
            if (sortBy !== 'cost') {
                const hit = await waitForHit(new RegExp(`sortBy=${sortBy}$`));
                assert.equal(hit, `/api/v1/health/claude/tenders?sortBy=${sortBy}`);
                // Only the clicked tab's sortBy is requested by the click.
                assert.ok(hits.slice(before).every((h) => h.endsWith(`sortBy=${sortBy}`)), JSON.stringify(hits.slice(before)));
            }
        }
    } finally {
        page.unmount();
        qc.clear();
    }
});
