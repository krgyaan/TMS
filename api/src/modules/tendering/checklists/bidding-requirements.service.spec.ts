jest.mock('uuid', () => ({
    v4: () => 'mock-uuid-v4',
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
    BIDDING_REQUIREMENTS_MIN_TIMEOUT_MS,
    BIDDING_REQUIREMENTS_SCHEMA_VERSION,
    BiddingRequirementsService,
} from './bidding-requirements.service';
import { StreamableFile } from '@nestjs/common';
import { tenderExtractions } from '@db/schemas/tendering/tender-extractions.schema';
import { AppLogger } from '@/logger/app-logger.service';
import { FileUploadService } from '@/modules/file-upload/file-upload.service';
import { FinanceDocumentsService } from '@/modules/shared/finance-documents/finance-documents.service';
import { TenderInfoSheetsService } from '@/modules/tendering/info-sheets/info-sheets.service';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { ClaudeUsageService } from '@/modules/master/claude-usage/claude-usage.service';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '@db/database.module';
import * as fs from 'fs';
import * as path from 'path';

describe('BiddingRequirementsService', () => {
    let service: BiddingRequirementsService;
    let mockDb: any;
    let mockClaudeUsageService: any;
    let mockTenderInfosService: any;
    let mockTenderInfoSheetsService: any;
    let mockFileUploadService: any;
    let mockFinanceDocumentsService: any;
    let mockConfigService: any;
    let mockAppLogger: any;

    const tempTestDir = path.join(__dirname, 'temp_test_pdf_breq');
    const tempPdfFile = path.join(tempTestDir, 'sample_breq.pdf');

    beforeAll(() => {
        if (!fs.existsSync(tempTestDir)) {
            fs.mkdirSync(tempTestDir, { recursive: true });
        }
        fs.writeFileSync(tempPdfFile, '%PDF-1.4 dummy tender content for testing');
    });

    afterAll(() => {
        if (fs.existsSync(tempPdfFile)) {
            fs.unlinkSync(tempPdfFile);
        }
        if (fs.existsSync(tempTestDir)) {
            fs.rmdirSync(tempTestDir);
        }
    });

    beforeEach(async () => {
        mockDb = {
            select: jest.fn().mockReturnValue({
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockResolvedValue([]),
                }),
            }),
            insert: jest.fn().mockReturnValue({
                values: jest.fn().mockReturnValue({
                    onConflictDoUpdate: jest.fn().mockResolvedValue({}),
                }),
            }),
        };

        mockClaudeUsageService = {
            recordUsage: jest.fn().mockResolvedValue(undefined),
        };

        mockTenderInfosService = {
            validateExists: jest.fn().mockResolvedValue({
                id: 1175,
                tenderNo: 'TND-1175',
                documents: [tempPdfFile],
            }),
        };

        mockTenderInfoSheetsService = {
            resolveTenderDocuments: jest.fn().mockReturnValue({
                mainTenderPath: tempPdfFile,
                atcPaths: [],
                boqPath: null,
                otherDocumentsPaths: [],
            }),
        };

        mockFileUploadService = {
            getAbsolutePath: jest.fn().mockReturnValue(tempPdfFile),
        };

        mockFinanceDocumentsService = {
            findAll: jest.fn().mockResolvedValue({ data: [], meta: { totalPages: 1 } }),
        };

        mockConfigService = {
            get: jest.fn((key: string) => {
                if (key.includes('serviceUrl') || key.includes('SERVICE_URL')) return 'http://localhost:8001';
                return undefined;
            }),
        };

        mockAppLogger = {
            withContext: jest.fn().mockReturnValue({
                log: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BiddingRequirementsService,
                { provide: DRIZZLE, useValue: mockDb },
                { provide: AppLogger, useValue: mockAppLogger },
                { provide: ClaudeUsageService, useValue: mockClaudeUsageService },
                { provide: TenderInfosService, useValue: mockTenderInfosService },
                { provide: TenderInfoSheetsService, useValue: mockTenderInfoSheetsService },
                { provide: FileUploadService, useValue: mockFileUploadService },
                { provide: FinanceDocumentsService, useValue: mockFinanceDocumentsService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        service = module.get<BiddingRequirementsService>(BiddingRequirementsService);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('analyzeForTender - Caching (Step 2)', () => {
        it('should return cached analysis directly and skip VolksAI call when cache exists and forceRefresh is false', async () => {
            const cachedResult = {
                jobId: 'breq_cached_123',
                requirements: [
                    {
                        documentName: 'GST Registration',
                        category: 'company',
                        required: true,
                        source: { document: 'main', page: 2, snippet: 'Submit GST' },
                        matchedLibraryId: '1',
                        confidence: 'high',
                        reasoning: 'Mandatory statutory document',
                    },
                ],
                llmUsage: { input_tokens: 500, output_tokens: 100 },
                // A current-shape entry (schemaVersion 1). Entries without schemaVersion are
                // stale by design and re-extracted instead of served.
                schemaVersion: 1,
                annexures: [],
                rejectedAnnexures: [],
                truncated: false,
            };

            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockResolvedValueOnce([
                        {
                            tenderId: 1175,
                            fields: {
                                biddingRequirementsAnalysis: cachedResult,
                                otherExtractedField: 'preserved',
                            },
                        },
                    ]),
                }),
            });

            // Mock fetch to ensure it is NOT called
            const fetchSpy = jest.spyOn(global, 'fetch');

            const result = await service.analyzeForTender(1175, false, 42);

            expect(result).toEqual(cachedResult);
            expect(fetchSpy).not.toHaveBeenCalled();
            expect(mockClaudeUsageService.recordUsage).not.toHaveBeenCalled();
            expect(mockDb.insert).not.toHaveBeenCalled();
        });

        it('should bypass cache when forceRefresh is true, call VolksAI, and update cache', async () => {
            const oldCachedResult = {
                jobId: 'breq_old_cached',
                requirements: [],
                llmUsage: null,
            };

            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockResolvedValueOnce([
                        {
                            tenderId: 1175,
                            fields: {
                                biddingRequirementsAnalysis: oldCachedResult,
                                existingField: 'value',
                            },
                        },
                    ]),
                }),
            });

            const volksAiResponse = {
                job_id: 'breq_new_456',
                requirements: [
                    {
                        documentName: 'OEM Authorization',
                        category: 'oem',
                        required: true,
                        source: { document: 'main', page: 5, snippet: 'OEM MAF required' },
                        matchedLibraryId: null,
                        confidence: 'high',
                        reasoning: 'OEM authorization required for hardware',
                    },
                ],
                llm_usage: {
                    input_tokens: 1200,
                    output_tokens: 250,
                    cache_creation_tokens: 0,
                    cache_read_tokens: 0,
                    estimated_cost_usd: 0.005,
                },
            };

            jest.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValueOnce(volksAiResponse),
            } as any);

            const result = await service.analyzeForTender(1175, true, 42);

            expect(result.jobId).toBe('breq_new_456');
            expect(result.requirements).toHaveLength(1);
            expect(result.requirements[0].documentName).toBe('OEM Authorization');

            // Verify cache update was executed
            expect(mockDb.insert).toHaveBeenCalled();

            // Verify token usage was recorded with call_type 'bidding_requirements'
            expect(mockClaudeUsageService.recordUsage).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 42,
                    tenderId: 1175,
                    jobId: 'breq_new_456',
                    usage: expect.objectContaining({
                        stages: expect.objectContaining({
                            bidding_requirements: expect.objectContaining({
                                call_type: 'bidding_requirements',
                                input_tokens: 1200,
                                output_tokens: 250,
                                estimated_cost_usd: 0.005,
                            }),
                        }),
                    }),
                }),
            );
        });

        it('should treat cached entry with missing or older schemaVersion as stale, call VolksAI for fresh analysis, and re-cache the fresh result', async () => {
            const staleCachedResult = {
                jobId: 'breq_stale_no_schema',
                requirements: [
                    {
                        documentName: 'Old Cached Requirement',
                        category: 'company',
                        required: true,
                        source: { document: 'main', page: 1, snippet: 'Old text' },
                        matchedLibraryId: null,
                        confidence: 'medium',
                        reasoning: 'Old reasoning from pre-annexure schema',
                    },
                ],
                llmUsage: null,
                // Intentionally NO schemaVersion (or older version) to simulate stale pre-annexure cache
            };

            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockResolvedValueOnce([
                        {
                            tenderId: 1175,
                            fields: {
                                biddingRequirementsAnalysis: staleCachedResult,
                                otherField: 'preserved',
                            },
                        },
                    ]),
                }),
            });

            const freshVolksAiResponse = {
                job_id: 'breq_fresh_v1',
                schemaVersion: BIDDING_REQUIREMENTS_SCHEMA_VERSION,
                requirements: [
                    {
                        documentName: 'Fresh Requirement',
                        category: 'oem',
                        required: true,
                        source: { document: 'main', page: 3, snippet: 'Fresh snippet' },
                        matchedLibraryId: null,
                        confidence: 'high',
                        reasoning: 'Fresh reasoning',
                    },
                ],
                annexures: [
                    {
                        annexureName: 'Annexure A - Bid Security Declaration',
                        source: { document: 'main', page: 10, snippet: 'Format of Bid Security Declaration' },
                        blocks: [
                            { type: 'heading', text: 'BID SECURITY DECLARATION' },
                            { type: 'paragraph', text: 'We hereby declare...' },
                        ],
                    },
                ],
                rejectedAnnexures: [],
                truncated: false,
                llm_usage: {
                    input_tokens: 1800,
                    output_tokens: 350,
                    cache_creation_tokens: 0,
                    cache_read_tokens: 0,
                    estimated_cost_usd: 0.009,
                },
            };

            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValueOnce(freshVolksAiResponse),
            } as any);

            // forceRefresh is false: proves that stale schemaVersion alone bypasses cache and triggers fresh analysis
            const result = await service.analyzeForTender(1175, false, 42);

            // 1. Confirm VolksAI /analyze-bidding-requirements was called
            expect(fetchSpy).toHaveBeenCalledTimes(1);
            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining('/analyze-bidding-requirements'),
                expect.objectContaining({ method: 'POST' }),
            );

            // 2. Confirm the fresh result with current schemaVersion is returned
            expect(result.jobId).toBe('breq_fresh_v1');
            expect(result.schemaVersion).toBe(BIDDING_REQUIREMENTS_SCHEMA_VERSION);
            expect(result.requirements).toHaveLength(1);
            expect(result.requirements[0].documentName).toBe('Fresh Requirement');
            expect(result.annexures).toHaveLength(1);
            expect(result.annexures[0].annexureName).toBe('Annexure A - Bid Security Declaration');

            // 3. Confirm result is re-cached in tender_extractions
            expect(mockDb.insert).toHaveBeenCalledTimes(1);
            expect(mockDb.insert).toHaveBeenCalledWith(tenderExtractions);
        });
    });

    describe('analyzeForTender - Token Usage Wiring (Step 1)', () => {
        it('should call ClaudeUsageService.recordUsage with bidding_requirements call_type on cache miss', async () => {
            // Cache miss
            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockResolvedValueOnce([]),
                }),
            });

            const volksAiResponse = {
                job_id: 'breq_fresh_789',
                requirements: [],
                llm_usage: {
                    input_tokens: 3000,
                    output_tokens: 400,
                    cache_creation_tokens: 1000,
                    cache_read_tokens: 500,
                    estimated_cost_usd: 0.0125,
                },
            };

            jest.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValueOnce(volksAiResponse),
            } as any);

            const result = await service.analyzeForTender(1175, false, 99);

            expect(result.jobId).toBe('breq_fresh_789');
            expect(mockClaudeUsageService.recordUsage).toHaveBeenCalledTimes(1);
            expect(mockClaudeUsageService.recordUsage).toHaveBeenCalledWith({
                userId: 99,
                tenderId: 1175,
                jobId: 'breq_fresh_789',
                durationMs: expect.any(Number),
                usage: {
                    stages: {
                        bidding_requirements: {
                            call_type: 'bidding_requirements',
                            model: 'claude-sonnet-4-5-20250929',
                            input_tokens: 3000,
                            output_tokens: 400,
                            cache_creation_tokens: 1000,
                            cache_read_tokens: 500,
                            total_tokens: 4900,
                            estimated_cost_usd: 0.0125,
                            calls_count: 1,
                        },
                    },
                },
            });
        });
    });

    describe('analyzeForTender - Role 3 timeout', () => {
        it('waits at least BIDDING_REQUIREMENTS_MIN_TIMEOUT_MS even when the shared VolksAI timeout is lower', async () => {
            mockConfigService.get.mockImplementation((key: string) => {
                if (key.includes('serviceUrl') || key.includes('SERVICE_URL')) return 'http://localhost:8001';
                if (key.includes('timeoutMs') || key.includes('TIMEOUT_MS')) return 120000; // /extract's shared value
                return undefined;
            });
            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({ where: jest.fn().mockResolvedValueOnce([]) }),
            });
            const timeoutSpy = jest.spyOn(AbortSignal, 'timeout');
            jest.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValueOnce({
                    schemaVersion: 1, job_id: 'breq_t', requirements: [], annexures: [], llm_usage: null,
                }),
            } as any);

            await service.analyzeForTender(1175, true, 1);

            expect(BIDDING_REQUIREMENTS_MIN_TIMEOUT_MS).toBe(240000);
            expect(timeoutSpy).toHaveBeenCalledWith(240000);
        });
    });

    describe('downloadAnnexureDocx - Annexure Download Isolation', () => {
        it('should call only /generate-annexure-docx endpoint and not call /analyze-bidding-requirements when downloading cached annexure', async () => {
            const storedBlocks: any[] = [
                { type: 'heading', text: 'ANNEXURE-I: BID SECURITY DECLARATION' },
                { type: 'paragraph', text: 'We, the bidder, certify that...' },
                { type: 'blank_field', label: 'Authorized Signatory Name' },
            ];

            const cachedResultWithAnnexures = {
                jobId: 'breq_cached_with_annexures',
                schemaVersion: BIDDING_REQUIREMENTS_SCHEMA_VERSION,
                requirements: [
                    {
                        documentName: 'Bid Security Declaration',
                        category: 'standard',
                        required: true,
                        source: { document: 'main', page: 5, snippet: 'Submit Bid Security Declaration' },
                        matchedLibraryId: null,
                        confidence: 'high',
                        reasoning: 'Mandatory annexure',
                    },
                ],
                annexures: [
                    {
                        annexureName: 'Bid Security Declaration',
                        source: { document: 'main', page: 12, snippet: 'Format of Annexure-I' },
                        blocks: storedBlocks,
                    },
                ],
                rejectedAnnexures: [],
                truncated: false,
                llmUsage: null,
            };

            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockResolvedValueOnce([
                        {
                            tenderId: 1175,
                            fields: {
                                biddingRequirementsAnalysis: cachedResultWithAnnexures,
                            },
                        },
                    ]),
                }),
            });

            // Mock binary response from /generate-annexure-docx
            const mockDocxBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // PK zip header
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: true,
                status: 200,
                arrayBuffer: jest.fn().mockResolvedValueOnce(mockDocxBytes.buffer),
            } as any);

            // Download annexure at index 0
            const file = await service.downloadAnnexureDocx(1175, 0);

            // 1. Confirm ONLY VolksAI's /generate-annexure-docx was called with the stored blocks
            expect(fetchSpy).toHaveBeenCalledTimes(1);
            expect(fetchSpy).toHaveBeenCalledWith(
                'http://localhost:8001/generate-annexure-docx',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        annexureName: 'Bid Security Declaration',
                        blocks: storedBlocks,
                    }),
                }),
            );

            // 2. Confirm /analyze-bidding-requirements was NEVER called (no fresh Claude read)
            expect(fetchSpy).not.toHaveBeenCalledWith(
                expect.stringContaining('/analyze-bidding-requirements'),
                expect.anything(),
            );

            // 3. Confirm no Claude usage was recorded
            expect(mockClaudeUsageService.recordUsage).not.toHaveBeenCalled();

            // 4. Confirm the returned file is a StreamableFile
            expect(file).toBeInstanceOf(StreamableFile);
        });
    });
});
