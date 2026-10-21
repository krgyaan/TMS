import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

jest.mock('uuid', () => ({
    v4: () => 'mock-uuid-v4',
}));

import { formatCurrency } from './info-sheets.service';

describe('formatCurrency helper', () => {
    it('returns "—" for null, undefined, empty, whitespace, and unparseable strings', () => {
        expect(formatCurrency(null)).toBe('—');
        expect(formatCurrency(undefined)).toBe('—');
        expect(formatCurrency('')).toBe('—');
        expect(formatCurrency('   ')).toBe('—');
        expect(formatCurrency('NA')).toBe('—');
        expect(formatCurrency('invalid-number')).toBe('—');
    });

    it('returns "0" for a real 0 (number or numeric string)', () => {
        expect(formatCurrency(0)).toBe('0');
        expect(formatCurrency('0')).toBe('0');
        expect(formatCurrency(0.0)).toBe('0');
        expect(formatCurrency('0.00')).toBe('0');
    });

    it('returns formatted INR currency for positive numbers', () => {
        expect(formatCurrency(1500)).toBe('₹1,500');
        expect(formatCurrency('250000')).toBe('₹2,50,000');
        expect(formatCurrency(10000000)).toBe('₹1,00,00,000');
    });
});

describe('tender-info-sheet-filled.hbs template rendering', () => {
    const templatePath = path.resolve(
        __dirname,
        '../../email/templates/tender-info-sheet-filled.hbs'
    );
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const compiled = handlebars.compile(templateSource);

    it('renders "0" when tender_value is formatted from 0', () => {
        const html = compiled({
            data: {
                is_recommended: true,
                tender_value: formatCurrency(0),
            },
        });
        expect(html).toContain('<td style="border: 1px solid #444; text-align: left; padding: 8px;">0</td>');
    });

    it('renders "—" when tender_value is formatted from null', () => {
        const html = compiled({
            data: {
                is_recommended: true,
                tender_value: formatCurrency(null),
            },
        });
        expect(html).toContain('<td style="border: 1px solid #444; text-align: left; padding: 8px;">—</td>');
    });

    it('renders "₹50,000" when tender_value is formatted from 50000', () => {
        const html = compiled({
            data: {
                is_recommended: true,
                tender_value: formatCurrency(50000),
            },
        });
        expect(html).toContain('<td style="border: 1px solid #444; text-align: left; padding: 8px;">₹50,000</td>');
    });
});
