jest.mock('uuid', () => ({
    v4: () => 'mock-uuid-v4',
}));

import * as fs from 'fs';
import * as path from 'path';
import { PgDialect } from 'drizzle-orm/pg-core';
import { createDb, createPool } from '@db';
import { tenderExtractions } from '@db/schemas/tendering/tender-extractions.schema';
import { eq } from 'drizzle-orm';
import {
    countExtractionFieldKeys,
    extractionFieldsUpsertValue,
    PRESERVED_EXTRACTION_FIELD_KEYS,
} from './extraction-fields-merge';
import { TenderInfoSheetsService } from './info-sheets.service';
import { PdfExtractionProcessor } from './pdf-extraction.processor';

/**
 * The PDF auto-extract worker and POST /info-sheets/:tenderId/extraction/save used to
 * upsert tender_extractions.fields by REPLACING the whole jsonb, which silently deleted
 * the cached bidding-requirements analysis (fields.biddingRequirementsAnalysis) stored in
 * the same row -- the checklist page then showed nothing and the next click paid for a
 * new Sonnet analysis. Both writers now carry preserved keys over from the stored row.
 */

const ANALYSIS = {
    jobId: 'breq_kochi_1',
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
    llmUsage: null, // nested null must survive exactly (no recursive null stripping)
    schemaVersion: 1,
    annexures: [{ annexureName: 'Format F-2A', source: { document: 'main', page: 68, snippet: 'FORMAT F-2A' }, blocks: [{ type: 'heading', text: 'FORMAT F-2A' }] }],
    rejectedAnnexures: [],
    truncated: false,
};

describe('extractionFieldsUpsertValue (SQL shape)', () => {
    const compile = (fields: Record<string, unknown>) => new PgDialect().sqlToQuery(extractionFieldsUpsertValue(fields));

    it('binds only the incoming extraction keys, and carries preserved keys from the stored row', () => {
        const { sql, params } = compile({ emdAmount: { value: 80144 }, biddingRequirementsAnalysis: { stale: true } });
        expect(JSON.parse(params[0] as string)).toEqual({ emdAmount: { value: 80144 } }); // stale copy dropped
        expect(sql).toContain('"tender_extractions"."fields" ?');
        expect(sql).toContain('jsonb_build_object(');
        expect(sql).not.toContain('jsonb_strip_nulls');
        expect(params).toContain('biddingRequirementsAnalysis');
    });

    it('preserves the bidding-requirements analysis key', () => {
        expect(PRESERVED_EXTRACTION_FIELD_KEYS).toContain('biddingRequirementsAnalysis');
    });

    it('countExtractionFieldKeys ignores preserved keys', () => {
        expect(countExtractionFieldKeys({ a: 1, b: 2, biddingRequirementsAnalysis: ANALYSIS })).toBe(2);
        expect(countExtractionFieldKeys(null)).toBe(0);
    });
});

/**
 * Real Postgres. Runs only when TENDER_EXTRACTIONS_TEST_DATABASE_URL points at a
 * DISPOSABLE database (the table is created and truncated here). Skipped otherwise.
 */
const TEST_DB_URL = process.env.TENDER_EXTRACTIONS_TEST_DATABASE_URL;
const describeDb = TEST_DB_URL ? describe : describe.skip;

describeDb('tender_extractions writers keep the cached analysis (real Postgres)', () => {
    let pool: ReturnType<typeof createPool>;
    let db: ReturnType<typeof createDb>;
    const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() };
    const appLogger: any = { withContext: () => logger };

    const makeInfoSheetsService = () =>
        new TenderInfoSheetsService(
            appLogger, db as any, {} as any,
            { validateExists: jest.fn().mockResolvedValue({ id: 1175 }) } as any,
            {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
        );

    const seed = async (fields: Record<string, unknown>) => {
        await db.insert(tenderExtractions).values({ tenderId: 1175, fields, missingFields: [] });
    };
    const storedFields = async () => {
        const [row] = await db.select().from(tenderExtractions).where(eq(tenderExtractions.tenderId, 1175));
        return row?.fields as Record<string, unknown>;
    };

    beforeAll(async () => {
        pool = createPool(TEST_DB_URL as string, 2, false);
        db = createDb(pool);
        const migration = fs.readFileSync(
            path.resolve(__dirname, '../../../../drizzle/0137_create_tender_extractions.sql'), 'utf8',
        );
        await pool.query(migration);
    });
    beforeEach(async () => { await pool.query('TRUNCATE tender_extractions RESTART IDENTITY'); });
    afterAll(async () => { await pool.end(); });

    it('extraction save: new extraction replaces old extraction keys, analysis kept exactly', async () => {
        await seed({ emdAmount: { value: 1 }, oldOnlyKey: { value: 'stale' }, biddingRequirementsAnalysis: ANALYSIS });

        const result = await makeInfoSheetsService().saveExtractionResult(
            1175, { fields: { emdAmount: { value: 80144 }, tenderValue: { value: 500000 } } }, 7,
        );

        expect(await storedFields()).toEqual({
            emdAmount: { value: 80144 },
            tenderValue: { value: 500000 },
            biddingRequirementsAnalysis: ANALYSIS,
        });
        expect(result).toMatchObject({ success: true, fieldsCount: 2, verified: true });
    });

    it('extraction save: a stale analysis copy in the payload does not overwrite the stored one', async () => {
        await seed({ emdAmount: { value: 1 }, biddingRequirementsAnalysis: ANALYSIS });
        await makeInfoSheetsService().saveExtractionResult(
            1175, { fields: { emdAmount: { value: 2 }, biddingRequirementsAnalysis: { jobId: 'stale_copy' } } }, 7,
        );
        expect((await storedFields()).biddingRequirementsAnalysis).toEqual(ANALYSIS);
    });

    it('extraction save: a tender never analysed gets no analysis key added', async () => {
        await seed({ emdAmount: { value: 1 } });
        await makeInfoSheetsService().saveExtractionResult(1175, { fields: { emdAmount: { value: 2 } } }, 7);
        expect(await storedFields()).toEqual({ emdAmount: { value: 2 } });
    });

    it('extraction save: first save for a tender inserts the fields as sent', async () => {
        await makeInfoSheetsService().saveExtractionResult(1175, { fields: { emdAmount: { value: 3 } } }, 7);
        expect(await storedFields()).toEqual({ emdAmount: { value: 3 } });
    });

    it('PDF auto-extract worker: a re-extraction keeps the analysis', async () => {
        await seed({ emdAmount: { value: 1 }, biddingRequirementsAnalysis: ANALYSIS });

        const tempPdf = path.join(__dirname, 'temp_merge_test.pdf');
        fs.writeFileSync(tempPdf, '%PDF-1.4 dummy');
        const originalFetch = global.fetch;
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ extraction_version: '1.0.0', fields: { emdAmount: { value: 80144 } }, missing_fields: [], processing_time_ms: 10 }),
        } as any);
        try {
            const processor = new PdfExtractionProcessor(
                { get: jest.fn() } as any,
                { getAbsolutePath: jest.fn().mockReturnValue(tempPdf) } as any,
                { recordUsage: jest.fn(), recordTpmEntry: jest.fn(), getCurrentTpm: jest.fn().mockResolvedValue(0) } as any,
                logger as any,
                db as any,
            );
            await processor.processJob(
                { id: 'extract-tender-1175', data: { tenderId: 1175, pdfPath: tempPdf, userId: 7 } } as any,
                'http://localhost:8001',
                120000,
            );
        } finally {
            global.fetch = originalFetch;
            fs.unlinkSync(tempPdf);
        }

        expect(await storedFields()).toEqual({ emdAmount: { value: 80144 }, biddingRequirementsAnalysis: ANALYSIS });
    });
});
