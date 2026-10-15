/// <reference types="node" />
// Run with: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./helpers/vite-env-loader.mjs', import.meta.url);
register('./helpers/tsx-loader.mjs', import.meta.url);

const React = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { ExtractionPreviewPanel } = await import('../src/modules/tendering/info-sheet/components/ExtractionPreviewPanel.tsx');

test('stale extraction: ExtractionPreviewPanel displays visible outdated notice banner and badges while retaining values read-only', () => {
    const mockFields = {
        tenderValue: {
            value: 5000000,
            raw_value: 'INR 50,00,000',
            confidence: 'high',
            source: 'regex',
            page: 2,
            snippet: 'Estimated Tender Value: INR 50,00,000',
            sources: {
                has_conflict: false,
                self_classified_atc: false,
                main_tender: {
                    value: 5000000,
                    raw_value: 'INR 50,00,000',
                    page: 2,
                    snippet: 'Estimated Tender Value: INR 50,00,000',
                    located: true,
                },
                atc: null,
            },
        },
    };

    const markupStale = renderToStaticMarkup(
        React.createElement(ExtractionPreviewPanel, {
            fields: mockFields as any,
            isStale: true,
        }),
    );

    // 1. Must show visible notice that tender documents changed and to run Analyze with AI again
    assert.ok(
        markupStale.includes('Tender documents changed since the last analysis; run Analyze with AI again'),
        'Notice banner must instruct user to run Analyze with AI again',
    );
    assert.ok(
        markupStale.includes('Outdated Extraction'),
        'Panel must show Outdated Extraction banner title',
    );

    // 2. Must display Outdated badge
    assert.ok(
        markupStale.includes('Outdated'),
        'Panel must display Outdated badge',
    );

    // 3. Values must still be displayed read-only
    assert.ok(
        markupStale.includes('Read-Only'),
        'Panel must maintain Read-Only badge',
    );
    assert.ok(
        markupStale.includes('50,00,000') || markupStale.includes('5000000'),
        'Old values must still be displayed',
    );

    // Non-stale panel must not display outdated banner
    const markupFresh = renderToStaticMarkup(
        React.createElement(ExtractionPreviewPanel, {
            fields: mockFields as any,
            isStale: false,
        }),
    );
    assert.ok(
        !markupFresh.includes('Outdated Extraction'),
        'Fresh extraction must not show outdated banner',
    );
    assert.ok(
        !markupFresh.includes('Tender documents changed since the last analysis'),
        'Fresh extraction must not show stale notice',
    );
});
