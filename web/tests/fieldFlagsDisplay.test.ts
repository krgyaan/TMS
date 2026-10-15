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
const { FieldWrapper } = await import('../src/components/form/FieldWrapper.tsx');
const { AiIndicatorsContext } = await import('../src/components/form/AiIndicatorsContext.tsx');

test('flags display: ExtractionPreviewPanel renders flag icon with message and rawValue', () => {
    const mockFields = {
        commercialEvaluation: {
            value: null,
            confidence: 'missing',
            source: 'regex',
            sources: {
                has_conflict: false,
                self_classified_atc: false,
                main_tender: {
                    value: 'Group Wise Evaluation Method )',
                    raw_value: 'Group Wise Evaluation Method )',
                    page: 7,
                    snippet: 'Evaluation Method ( Group Wise Evaluation Method )',
                    located: true,
                },
                atc: null,
                located: true,
            },
            flags: [
                {
                    code: 'UNMAPPED_VALUE',
                    message: "Raw value 'Group wise evaluation' could not be mapped to known evaluation modes ('item-wise', 'overall')",
                    rawValue: 'Group wise evaluation',
                },
            ],
        },
    };

    const markup = renderToStaticMarkup(
        React.createElement(ExtractionPreviewPanel, {
            fields: mockFields as any,
        }),
    );

    // 1. Must contain field-flags container and preview-field-flag-item
    assert.ok(
        markup.includes('field-flags-commercialEvaluation'),
        'Must render field-flags-commercialEvaluation container in ExtractionPreviewPanel',
    );
    assert.ok(
        markup.includes('preview-field-flag-item'),
        'Must render preview-field-flag-item in ExtractionPreviewPanel',
    );

    // 2. Must render the flag message and rawValue
    assert.ok(
        markup.includes('could not be mapped to known evaluation modes'),
        'Must display the flag message',
    );
    assert.ok(
        markup.includes('Group wise evaluation'),
        'Must display the rawValue in the flag badge',
    );

    // 3. Must render the flag icon (lucide-flag SVG)
    assert.ok(
        markup.includes('lucide-flag'),
        'Must display the Lucide flag icon next to the message',
    );
});

const { useForm, FormProvider } = await import('react-hook-form');

test('flags display: FieldWrapper in InfoSheetForm renders flag icon with message and rawValue for flagged fields', () => {
    const mockIndicators = {
        commercialEvaluation: {
            type: 'missing' as const,
            label: 'Flagged Value',
            message: "Raw value 'Group wise evaluation' could not be mapped to known evaluation modes ('item-wise', 'overall')",
            rawKey: 'commercialEvaluation',
            flags: [
                {
                    code: 'UNMAPPED_VALUE',
                    message: "Raw value 'Group wise evaluation' could not be mapped to known evaluation modes ('item-wise', 'overall')",
                    rawValue: 'Group wise evaluation',
                },
            ],
        },
    };

    function TestFormWrapper() {
        const form = useForm({ defaultValues: { commercialEvaluation: '' } });
        return React.createElement(
            FormProvider,
            form,
            React.createElement(
                AiIndicatorsContext.Provider,
                { value: mockIndicators },
                React.createElement(
                    FieldWrapper,
                    {
                        control: form.control,
                        name: 'commercialEvaluation' as any,
                        label: 'Commercial Evaluation',
                    },
                    () => React.createElement('div', { 'data-testid': 'mock-input' }, 'select mock'),
                ),
            ),
        );
    }

    const markup = renderToStaticMarkup(React.createElement(TestFormWrapper));

    // 1. Must render field flags container for commercialEvaluation
    assert.ok(
        markup.includes('field-flags-commercialEvaluation'),
        'Must render field-flags-commercialEvaluation in form field',
    );
    assert.ok(
        markup.includes('form-field-flag-item'),
        'Must render form-field-flag-item',
    );

    // 2. Must render flag message and rawValue
    assert.ok(
        markup.includes('could not be mapped to known evaluation modes'),
        'Must display flag message in form field',
    );
    assert.ok(
        markup.includes('Group wise evaluation'),
        'Must display rawValue in form field',
    );

    // 3. Must render flag icon
    assert.ok(
        markup.includes('lucide-flag'),
        'Must render flag icon in form field',
    );
});
