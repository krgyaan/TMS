jest.mock('uuid', () => ({
    v4: () => 'mock-uuid-v4',
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PgDialect } from 'drizzle-orm/pg-core';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TenderAnnexuresService } from './tender-annexures.service';
import { AppLogger } from '@/logger/app-logger.service';
import { FileUploadService } from '@/modules/file-upload/file-upload.service';
import { ClaudeUsageService } from '@/modules/master/claude-usage/claude-usage.service';
import { TenderInfoSheetsService } from '@/modules/tendering/info-sheets/info-sheets.service';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { DRIZZLE } from '@db/database.module';

/**
 * VolksAI is mocked via a stubbed global fetch (no live VolksAI / Anthropic calls).
 * FileUploadService is the REAL implementation rooted in a temp dir, so "saved to disk
 * at the recorded path" is checked against the actual filesystem.
 */
describe('TenderAnnexuresService', () => {
    let service: TenderAnnexuresService;
    let fileUploadService: FileUploadService;
    let mockDb: any;
    let setSpy: jest.Mock;
    let returningResult: any[];
    let mockClaudeUsageService: any;
    let fetchSpy: jest.SpyInstance;
    let tmpRoot: string;
    let mainPdf: string;

    const JOB_ID = 'annx_abc123def456';
    const DOCX_A = Buffer.from('PK\u0003\u0004 fake-docx-A');
    const DOCX_B = Buffer.from('PK\u0003\u0004 fake-docx-B');

    const volksAiResponse = {
        job_id: JOB_ID,
        annexures: [
            {
                annexureName: 'Format F-2A: Declaration for Bid Security',
                source: { document: 'main', page: 68, snippet: 'FORMAT F-2A DECLARATION FOR BID SECURITY' },
                docxPath: `${JOB_ID}/01_format-f-2a-declaration-for-bid-security.docx`,
                downloadUrl: `/annexure-files/${JOB_ID}/01_format-f-2a-declaration-for-bid-security.docx`,
            },
            {
                annexureName: 'Annexure-I: Guaranteed Technical Particulars',
                source: { document: 'atc', page: 8, snippet: 'Annexure-I Guarantee Technical Particulars' },
                docxPath: `${JOB_ID}/02_annexure-i-guaranteed-technical-particulars.docx`,
                downloadUrl: `/annexure-files/${JOB_ID}/02_annexure-i-guaranteed-technical-particulars.docx`,
            },
        ],
        rejected: [{ annexureName: 'Bogus', reason: 'missing source citation' }],
        truncated: false,
        llm_usage: { input_tokens: 800, output_tokens: 600, estimated_cost_usd: 0.01, model: 'claude-sonnet-5' },
    };

    const okJson = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
    const okBytes = (buf: Buffer) => new Response(new Uint8Array(buf), { status: 200 });

    function stubVolksAi(overrides: { identify?: () => Response; files?: Record<string, () => Response> } = {}) {
        fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (input: any) => {
            const url = String(input);
            if (url === 'http://localhost:8001/identify-annexures') {
                return overrides.identify ? overrides.identify() : okJson(volksAiResponse);
            }
            const fileKey = url.replace('http://localhost:8001/annexure-files/', '');
            if (overrides.files?.[fileKey]) return overrides.files[fileKey]();
            if (fileKey.startsWith(`${JOB_ID}/01_`)) return okBytes(DOCX_A);
            if (fileKey.startsWith(`${JOB_ID}/02_`)) return okBytes(DOCX_B);
            return new Response('not found', { status: 404 });
        });
    }

    function checklistFiles(): string[] {
        const dir = path.join(tmpRoot, 'uploads', 'tendering', 'checklists');
        return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    }

    beforeEach(async () => {
        tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tms-annexures-'));
        mainPdf = path.join(tmpRoot, 'tender_main.pdf');
        fs.writeFileSync(mainPdf, '%PDF-1.4 dummy tender');

        const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
        const mockAppLogger = { withContext: jest.fn().mockReturnValue(logger) };

        // Real FileUploadService, with uploads root redirected into the temp dir.
        jest.spyOn(process, 'cwd').mockReturnValue(tmpRoot);
        fileUploadService = new FileUploadService(mockAppLogger as unknown as AppLogger);

        returningResult = [{ id: 7 }];
        setSpy = jest.fn().mockImplementation(() => ({
            where: jest.fn().mockReturnValue({
                returning: jest.fn().mockImplementation(async () => returningResult),
            }),
        }));
        mockDb = {
            update: jest.fn().mockReturnValue({ set: setSpy }),
            insert: jest.fn(),
            select: jest.fn(),
        };

        mockClaudeUsageService = { recordUsage: jest.fn().mockResolvedValue(undefined) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TenderAnnexuresService,
                { provide: DRIZZLE, useValue: mockDb },
                { provide: AppLogger, useValue: mockAppLogger },
                { provide: ClaudeUsageService, useValue: mockClaudeUsageService },
                {
                    provide: TenderInfosService,
                    useValue: { validateExists: jest.fn().mockResolvedValue({ id: 1175, documents: [mainPdf] }) },
                },
                {
                    provide: TenderInfoSheetsService,
                    useValue: {
                        resolveTenderDocuments: jest.fn().mockReturnValue({
                            mainTenderPath: mainPdf,
                            atcPaths: [],
                            boqPath: null,
                            otherDocumentsPaths: [],
                        }),
                    },
                },
                { provide: FileUploadService, useValue: fileUploadService },
                {
                    provide: ConfigService,
                    useValue: { get: jest.fn((key: string) => (key.includes('serviceUrl') ? 'http://localhost:8001/' : undefined)) },
                },
            ],
        }).compile();

        service = module.get(TenderAnnexuresService);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        fs.rmSync(tmpRoot, { recursive: true, force: true });
    });

    it('calls VolksAI /identify-annexures with the tender main PDF as multipart pdf_file', async () => {
        stubVolksAi();
        await service.identifyAnnexuresForTender(1175, 42);

        const [url, init] = fetchSpy.mock.calls[0];
        expect(url).toBe('http://localhost:8001/identify-annexures');
        expect(init.method).toBe('POST');
        const form = init.body as FormData;
        expect((form.get('pdf_file') as File).name).toBe('tender_main.pdf');
    });

    it('fetches each generated .docx and saves it to disk at exactly the recorded path', async () => {
        stubVolksAi();
        const result = await service.identifyAnnexuresForTender(1175, 42);

        expect(fetchSpy).toHaveBeenCalledWith(
            `http://localhost:8001/annexure-files/${JOB_ID}/01_format-f-2a-declaration-for-bid-security.docx`,
            expect.anything(),
        );
        expect(result.annexures).toHaveLength(2);

        const [a, b] = result.annexures;
        // Base name is capped at 50 chars, same as FileUploadService.processAndSave.
        expect(a.path).toMatch(/^checklists\/\d+_tender1175_01_format-f-2a-declaration-for-bid-secu\.docx$/);
        expect(b.path).toMatch(/^checklists\/\d+_tender1175_02_annexure-i-guaranteed-technical-part\.docx$/);

        // The recorded paths resolve (via the same FileUploadService the serve route uses)
        // to real files under uploads/tendering/checklists with the fetched bytes.
        const absA = fileUploadService.getAbsolutePath(a.path);
        const absB = fileUploadService.getAbsolutePath(b.path);
        expect(absA.startsWith(path.join(tmpRoot, 'uploads', 'tendering', 'checklists'))).toBe(true);
        expect(fs.readFileSync(absA).equals(DOCX_A)).toBe(true);
        expect(fs.readFileSync(absB).equals(DOCX_B)).toBe(true);
        expect(await fileUploadService.exists(a.path)).toBe(true);

        expect(result.annexures[0].source).toEqual(volksAiResponse.annexures[0].source);
        expect(result.rejected).toEqual(volksAiResponse.rejected);
        expect(result.jobId).toBe(JOB_ID);
    });

    it('appends {name, path} to extra_documents with an atomic jsonb concat that preserves existing entries', async () => {
        stubVolksAi();
        const result = await service.identifyAnnexuresForTender(1175, 42);

        expect(result.appendedToChecklist).toBe(true);
        expect(mockDb.update).toHaveBeenCalledTimes(1);
        // Never read-modify-write and never insert (insert would overwrite / create a row).
        expect(mockDb.select).not.toHaveBeenCalled();
        expect(mockDb.insert).not.toHaveBeenCalled();

        const setArg = setSpy.mock.calls[0][0];
        const compiled = new PgDialect().sqlToQuery(setArg.extraDocuments);

        // The SET expression concatenates onto the column's CURRENT value in Postgres --
        // existing entries are kept, the new ones are added after them.
        expect(compiled.sql).toBe(
            `COALESCE("tender_document_checklists"."extra_documents", '[]'::jsonb) || $1::jsonb`,
        );
        // The only bound parameter is the NEW entries -- not a full replacement array.
        expect(JSON.parse(compiled.params[0] as string)).toEqual([
            { name: 'Format F-2A: Declaration for Bid Security', path: result.annexures[0].path },
            { name: 'Annexure-I: Guaranteed Technical Particulars', path: result.annexures[1].path },
        ]);
    });

    it('does not create a checklist row (which would mark it submitted) when none exists; files are still saved', async () => {
        stubVolksAi();
        returningResult = []; // UPDATE matched no row
        const result = await service.identifyAnnexuresForTender(1175, 42);

        expect(result.appendedToChecklist).toBe(false);
        expect(mockDb.insert).not.toHaveBeenCalled();
        expect(result.annexures).toHaveLength(2);
        expect(fs.existsSync(fileUploadService.getAbsolutePath(result.annexures[0].path))).toBe(true);
    });

    it('cleans up already-saved files and skips the DB write if a later docx download fails', async () => {
        stubVolksAi({
            files: { [`${JOB_ID}/02_annexure-i-guaranteed-technical-particulars.docx`]: () => new Response('gone', { status: 404 }) },
        });

        await expect(service.identifyAnnexuresForTender(1175, 42)).rejects.toThrow(/HTTP 404/);
        expect(mockDb.update).not.toHaveBeenCalled();
        expect(checklistFiles()).toEqual([]);
    });

    it('cleans up saved files if the extra_documents append fails', async () => {
        stubVolksAi();
        setSpy.mockImplementation(() => ({
            where: () => ({ returning: async () => { throw new Error('db down'); } }),
        }));

        await expect(service.identifyAnnexuresForTender(1175, 42)).rejects.toThrow('db down');
        expect(checklistFiles()).toEqual([]);
    });

    it('rejects a docxPath that is not "<job>/<file>.docx" instead of fetching it', async () => {
        stubVolksAi({
            identify: () => okJson({ ...volksAiResponse, annexures: [{ ...volksAiResponse.annexures[0], docxPath: '../../etc/passwd' }] }),
        });

        await expect(service.identifyAnnexuresForTender(1175, 42)).rejects.toThrow(/invalid annexure docxPath/);
        expect(fetchSpy).toHaveBeenCalledTimes(1); // only the identify call
        expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('surfaces a VolksAI HTTP error instead of returning an empty result', async () => {
        stubVolksAi({ identify: () => new Response('ANTHROPIC_API_KEY missing', { status: 503, statusText: 'Service Unavailable' }) });
        await expect(service.identifyAnnexuresForTender(1175, 42)).rejects.toThrow(/HTTP 503/);
        expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('makes no DB write when VolksAI finds no annexures', async () => {
        stubVolksAi({ identify: () => okJson({ ...volksAiResponse, annexures: [], llm_usage: null }) });
        const result = await service.identifyAnnexuresForTender(1175, 42);
        expect(result.annexures).toEqual([]);
        expect(result.appendedToChecklist).toBe(false);
        expect(mockDb.update).not.toHaveBeenCalled();
        expect(mockClaudeUsageService.recordUsage).not.toHaveBeenCalled();
    });

    it('records Claude token usage under call_type annexure_identification', async () => {
        stubVolksAi();
        await service.identifyAnnexuresForTender(1175, 42);
        const params = mockClaudeUsageService.recordUsage.mock.calls[0][0];
        expect(params.tenderId).toBe(1175);
        expect(params.userId).toBe(42);
        expect(params.usage.stages.annexure_identification).toMatchObject({
            call_type: 'annexure_identification',
            model: 'claude-sonnet-5',
            input_tokens: 800,
            output_tokens: 600,
            total_tokens: 1400,
        });
    });
});
