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
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';

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

    it('countExtractionFieldKeys ignores preserved keys and metadata', () => {
        expect(countExtractionFieldKeys({ a: 1, b: 2, biddingRequirementsAnalysis: ANALYSIS, metadata: { llm_status: 'ok' } })).toBe(2);
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

    const makeTendersService = () =>
        new (TenderInfosService as any)(
            appLogger,
            db as any,
            {} as any,
            { sendTenderUpdateEmail: jest.fn() } as any,
            {} as any,
            { stopTimer: jest.fn(), startTimer: jest.fn() } as any,
            { get: jest.fn() } as any,
            {} as any,
            { notifyTenderAllocated: jest.fn().mockResolvedValue(undefined) } as any,
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
        await pool.query(`
            CREATE TABLE IF NOT EXISTS "tender_infos" (
                "id" serial PRIMARY KEY,
                "team" bigint DEFAULT 1,
                "tender_no" varchar(255) DEFAULT 'TND-1',
                "organization" bigint,
                "tender_name" varchar(255) DEFAULT 'TND',
                "item" bigint DEFAULT 1,
                "gst_values" numeric(15, 2) DEFAULT '0',
                "tender_fees" numeric(15, 2) DEFAULT '0',
                "emd" numeric(15, 2) DEFAULT '0',
                "team_member" bigint,
                "due_date" timestamp with time zone DEFAULT now(),
                "remarks" varchar(200),
                "status" bigint DEFAULT 1,
                "location" bigint,
                "website" bigint,
                "courier_address" text,
                "delete_status" integer DEFAULT 0,
                "documents" text,
                "tl_remarks" text,
                "tl_approval_remarks" text,
                "tl_approval_timestamp" timestamp with time zone,
                "rfq_to" varchar(200),
                "tl_status" integer DEFAULT 0,
                "processing_fee_mode" varchar(100),
                "tender_fee_mode" varchar(100),
                "emd_mode" varchar(100),
                "approve_pqr_selection" varchar(50),
                "approve_finance_doc_selection" varchar(50),
                "tender_approval_status" varchar(50),
                "tl_rejection_remarks" text,
                "tl_incomplete_remarks" text,
                "oem_not_allowed" text[],
                "rfq_required" varchar(10),
                "quotation_files" text,
                "created_at" timestamp with time zone DEFAULT now(),
                "updated_at" timestamp with time zone DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS "bidding_requirements_jobs" (
                "id" serial PRIMARY KEY,
                "tender_id" integer NOT NULL,
                "status" varchar(20) DEFAULT 'pending',
                "updated_at" timestamp with time zone DEFAULT now()
            );
        `);
    });
    beforeEach(async () => { await pool.query('TRUNCATE tender_extractions RESTART IDENTITY'); });
    afterAll(async () => { await pool.end(); });

    it('extraction save: new extraction replaces old extraction keys, analysis kept exactly', async () => {
        await seed({
            emdAmount: { value: 1 },
            oldOnlyKey: { value: 'stale' },
            biddingRequirementsAnalysis: ANALYSIS,
            metadata: { llm_status: 'ok', failed_categories: [] },
        });

        const result = await makeInfoSheetsService().saveExtractionResult(
            1175, { fields: { emdAmount: { value: 80144 }, tenderValue: { value: 500000 } } }, 7,
        );

        expect(await storedFields()).toEqual({
            emdAmount: { value: 80144 },
            tenderValue: { value: 500000 },
            biddingRequirementsAnalysis: ANALYSIS,
            metadata: { llm_status: 'ok', failed_categories: [] },
        });
        expect(result).toMatchObject({ success: true, fieldsCount: 2, verified: true });
    });

    it('extraction save: a stale analysis copy in the payload does not overwrite the stored one', async () => {
        await seed({ emdAmount: { value: 1 }, biddingRequirementsAnalysis: ANALYSIS, metadata: { llm_status: 'ok', failed_categories: [] } });
        await makeInfoSheetsService().saveExtractionResult(
            1175, { fields: { emdAmount: { value: 2 }, biddingRequirementsAnalysis: { jobId: 'stale_copy' } } }, 7,
        );
        expect((await storedFields()).biddingRequirementsAnalysis).toEqual(ANALYSIS);
    });

    it('extraction save: a tender never analysed gets no analysis key added', async () => {
        await seed({ emdAmount: { value: 1 }, metadata: { llm_status: 'ok', failed_categories: [] } });
        await makeInfoSheetsService().saveExtractionResult(1175, { fields: { emdAmount: { value: 2 } } }, 7);
        expect(await storedFields()).toEqual({
            emdAmount: { value: 2 },
            metadata: { llm_status: 'ok', failed_categories: [] },
        });
    });

    it('extraction save: first save for a tender inserts the fields as sent', async () => {
        await makeInfoSheetsService().saveExtractionResult(1175, { fields: { emdAmount: { value: 3 } }, llm_status: 'ok', failed_categories: [] }, 7);
        expect(await storedFields()).toEqual({
            emdAmount: { value: 3 },
            metadata: { llm_status: 'ok', failed_categories: [] },
        });
    });

    it('extraction save: keeps stored non-ok llm_status and failed_categories when caller sends none', async () => {
        await seed({
            emdAmount: { value: 1 },
            metadata: { llm_status: 'llm_unavailable', failed_categories: ['pbg_sd'] },
        });

        await makeInfoSheetsService().saveExtractionResult(
            1175,
            { fields: { emdAmount: { value: 500 } } },
            7,
        );

        expect(await storedFields()).toEqual({
            emdAmount: { value: 500 },
            metadata: { llm_status: 'llm_unavailable', failed_categories: ['pbg_sd'] },
        });
    });

    it('PDF auto-extract worker: a re-extraction keeps the analysis and flags AI values with reviewed: false', async () => {
        await seed({ emdAmount: { value: 1 }, biddingRequirementsAnalysis: ANALYSIS, metadata: { llm_status: 'ok', failed_categories: [] } });

        const tempPdf = path.join(__dirname, 'temp_merge_test.pdf');
        fs.writeFileSync(tempPdf, '%PDF-1.4 dummy');
        const originalFetch = global.fetch;
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ extraction_version: '1.0.0', fields: { emdAmount: { value: 80144 } }, missing_fields: [], processing_time_ms: 10, llm_status: 'ok', failed_categories: [] }),
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

        expect(await storedFields()).toEqual({
            emdAmount: { value: 80144, reviewed: false },
            biddingRequirementsAnalysis: ANALYSIS,
            metadata: { llm_status: 'ok', failed_categories: [] },
        });
    });

    it('PDF auto-extract worker: keeps stored non-ok llm_status and failed_categories when worker result omits them', async () => {
        await seed({
            emdAmount: { value: 1 },
            metadata: { llm_status: 'llm_unavailable', failed_categories: ['prs_ld'] },
        });

        const tempPdf = path.join(__dirname, 'temp_merge_test2.pdf');
        fs.writeFileSync(tempPdf, '%PDF-1.4 dummy');
        const originalFetch = global.fetch;
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                extraction_version: '1.0.0',
                fields: { emdAmount: { value: 80144 } },
                missing_fields: [],
                processing_time_ms: 10,
            }),
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

        expect(await storedFields()).toEqual({
            emdAmount: { value: 80144, reviewed: false },
            metadata: { llm_status: 'llm_unavailable', failed_categories: ['prs_ld'] },
        });
    });

    it('PDF auto-extract worker: failure midway through transaction rolls back write leaving pre-existing row unchanged', async () => {
        const initialRow = {
            emdAmount: { value: 55555 },
            metadata: { llm_status: 'ok', failed_categories: [] },
        };
        await seed(initialRow);

        const tempPdf = path.join(__dirname, 'temp_merge_rollback_test.pdf');
        fs.writeFileSync(tempPdf, '%PDF-1.4 dummy');
        const originalFetch = global.fetch;
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                extraction_version: '1.0.0',
                fields: { emdAmount: { value: 999999 } },
                missing_fields: [],
                processing_time_ms: 10,
                llm_status: 'ok',
                failed_categories: [],
            }),
        } as any);

        const originalTransaction = db.transaction.bind(db);
        const failingDb = Object.create(db);
        failingDb.transaction = async (fn: any) => {
            return originalTransaction(async (tx: any) => {
                await fn(tx);
                throw new Error('Midway transaction failure before commit');
            });
        };

        try {
            const processor = new PdfExtractionProcessor(
                { get: jest.fn() } as any,
                { getAbsolutePath: jest.fn().mockReturnValue(tempPdf) } as any,
                { recordUsage: jest.fn(), recordTpmEntry: jest.fn(), getCurrentTpm: jest.fn().mockResolvedValue(0) } as any,
                logger as any,
                failingDb as any,
            );

            await expect(
                processor.processJob(
                    { id: 'extract-tender-1175', data: { tenderId: 1175, pdfPath: tempPdf, userId: 7 } } as any,
                    'http://localhost:8001',
                    120000,
                ),
            ).rejects.toThrow(/EXTRACTION_SAVE_FAILED/);
        } finally {
            global.fetch = originalFetch;
            if (fs.existsSync(tempPdf)) {
                fs.unlinkSync(tempPdf);
            }
        }

        // Real Postgres verification: transaction rollback leaves pre-existing row completely unchanged
        const currentFields = await storedFields();
        expect(currentFields).toEqual(initialRow);

        // Also verify for an unseeded tender 9999: nothing saved
        const [unseededRow] = await db
            .select()
            .from(tenderExtractions)
            .where(eq(tenderExtractions.tenderId, 9999));
        expect(unseededRow).toBeUndefined();
    });

    it('TendersService stale update: marks extractionVersion stale in real Postgres while fields row is byte-identical', async () => {
        // Complex stored extraction record with diverse types, nested objects, arrays, and unicode
        const complexFields = {
            tenderValue: { value: 12500000, confidence: 'high', source: 'regex', page: 3, snippet: 'Tender Value: 1.25 Cr' },
            emdAmount: { value: 250000, confidence: 'high', source: 'regex', page: 4, snippet: 'EMD: Rs 2,50,000' },
            deliveryTimeSupply: { value: 180, confidence: 'medium', source: 'llm', page: 7, snippet: 'Supply period is 180 days' },
            biddingRequirementsAnalysis: ANALYSIS,
            metadata: {
                llm_status: 'ok',
                failed_categories: [],
                extraction_timestamp: '2026-10-15T18:00:00.000Z',
                user_notes: 'User verified on 2026-10-15',
            },
        };

        const initialVersion = '1.0.0:abcdef1234567890abcdef1234567890';
        await db.insert(tenderExtractions).values({
            tenderId: 1175,
            fields: complexFields,
            missingFields: ['pbgDuration'],
            extractionVersion: initialVersion,
        });

        // Insert matching row in tender_infos
        await pool.query(`
            INSERT INTO "tender_infos" ("id", "tender_no", "tender_name", "documents")
            VALUES (1175, 'TND-1175', 'Test Tender 1175', 'v1_tender.pdf')
            ON CONFLICT ("id") DO UPDATE SET "documents" = 'v1_tender.pdf'
        `);

        // Capture raw byte content before the update directly from Postgres
        const beforeResult = await pool.query(`SELECT fields, missing_fields, extraction_version FROM tender_extractions WHERE tender_id = 1175`);
        const beforeRow = beforeResult.rows[0];
        const beforeFieldsJson = JSON.stringify(beforeRow.fields);
        const beforeMissingJson = JSON.stringify(beforeRow.missing_fields);
        const beforeBytes = Buffer.from(beforeFieldsJson, 'utf8');

        expect(beforeRow.extraction_version).toBe(initialVersion);

        // Run TendersService.update with changed documents to trigger stale update
        const tendersService = makeTendersService();
        jest.spyOn(tendersService, 'findById').mockResolvedValue({
            id: 1175,
            tenderNo: 'TND-1175',
            documents: 'v1_tender.pdf',
        } as any);

        await tendersService.update(1175, { documents: 'v2_updated_tender.pdf' }, 7);

        // Fetch row from Postgres after the update
        const afterResult = await pool.query(`SELECT fields, missing_fields, extraction_version FROM tender_extractions WHERE tender_id = 1175`);
        const afterRow = afterResult.rows[0];
        const afterFieldsJson = JSON.stringify(afterRow.fields);
        const afterMissingJson = JSON.stringify(afterRow.missing_fields);
        const afterBytes = Buffer.from(afterFieldsJson, 'utf8');

        // 1. extractionVersion was updated to 'stale'
        expect(afterRow.extraction_version).toBe('stale');

        // 2. fields row is byte-identical (both string-equal and Buffer-equal)
        expect(afterFieldsJson).toBe(beforeFieldsJson);
        expect(afterBytes.equals(beforeBytes)).toBe(true);
        expect(afterMissingJson).toBe(beforeMissingJson);
        expect(afterRow.fields).toEqual(complexFields);
    });
});
