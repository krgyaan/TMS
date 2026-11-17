import { buildFileServeUrl, resolveTenderDocumentPaths } from './tender-documents.util';

describe('resolveTenderDocumentPaths', () => {
    it('resolves the structured tender documents shape in display order', () => {
        const documents = JSON.stringify({
            schemaVersion: 1,
            mainTender: 'tender-documents/nit.pdf',
            atc: ['tender-documents/atc-1.pdf', 'tender-documents/atc-2.pdf'],
            boq: 'tender-documents/boq.xlsx',
            otherDocuments: ['tender-documents/drawing.pdf'],
        });

        expect(resolveTenderDocumentPaths(documents)).toEqual([
            'tender-documents/nit.pdf',
            'tender-documents/atc-1.pdf',
            'tender-documents/atc-2.pdf',
            'tender-documents/boq.xlsx',
            'tender-documents/drawing.pdf',
        ]);
    });

    it('accepts an already parsed structured object', () => {
        expect(
            resolveTenderDocumentPaths({
                mainTender: 'tender-documents/nit.pdf',
                atc: [],
                boq: null,
                otherDocuments: ['tender-documents/other.pdf'],
            }),
        ).toEqual(['tender-documents/nit.pdf', 'tender-documents/other.pdf']);
    });

    it('keeps backward compatibility with a legacy flat array', () => {
        expect(resolveTenderDocumentPaths(['tenders/nit.pdf', 'tenders/boq.xlsx'])).toEqual([
            'tenders/nit.pdf',
            'tenders/boq.xlsx',
        ]);
    });

    it('keeps backward compatibility with a JSON-stringified flat array', () => {
        expect(resolveTenderDocumentPaths('["tenders/nit.pdf","tenders/boq.xlsx"]')).toEqual([
            'tenders/nit.pdf',
            'tenders/boq.xlsx',
        ]);
    });

    it('keeps backward compatibility with a comma-separated string', () => {
        expect(resolveTenderDocumentPaths('tenders/nit.pdf, tenders/boq.xlsx')).toEqual([
            'tenders/nit.pdf',
            'tenders/boq.xlsx',
        ]);
    });

    it('keeps backward compatibility with a single path', () => {
        expect(resolveTenderDocumentPaths('tenders/nit.pdf')).toEqual(['tenders/nit.pdf']);
    });

    it('returns an empty list for empty or missing documents', () => {
        expect(resolveTenderDocumentPaths(null)).toEqual([]);
        expect(resolveTenderDocumentPaths(undefined)).toEqual([]);
        expect(resolveTenderDocumentPaths('')).toEqual([]);
        expect(resolveTenderDocumentPaths('   ')).toEqual([]);
    });

    it('deduplicates repeated paths', () => {
        expect(
            resolveTenderDocumentPaths({
                mainTender: 'tender-documents/nit.pdf',
                atc: ['tender-documents/nit.pdf'],
                boq: null,
                otherDocuments: ['tender-documents/nit.pdf'],
            }),
        ).toEqual(['tender-documents/nit.pdf']);
    });
});

describe('buildFileServeUrl', () => {
    it('builds a file-serve URL and normalizes slashes', () => {
        expect(buildFileServeUrl('https://tms.example.com/api/v1/', '/tender-documents/nit.pdf')).toBe(
            'https://tms.example.com/api/v1/files/serve/tender-documents/nit.pdf',
        );
    });

    it('builds a relative URL when the API URL is not configured', () => {
        expect(buildFileServeUrl('', 'tender-documents/nit.pdf')).toBe(
            '/files/serve/tender-documents/nit.pdf',
        );
    });
});
