jest.mock('uuid', () => ({
    v4: () => 'mock-uuid-v4',
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
    BIDDING_REQUIREMENTS_LOCK_POLL_MS,
    BIDDING_REQUIREMENTS_LOCK_TTL_MS,
    BIDDING_REQUIREMENTS_MIN_TIMEOUT_MS,
    BIDDING_REQUIREMENTS_SCHEMA_VERSION,
    BiddingRequirementsService,
} from './bidding-requirements.service';
import {
    BadGatewayException,
    GatewayTimeoutException,
    ServiceUnavailableException,
    StreamableFile,
} from '@nestjs/common';
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
                    model: 'claude-sonnet-5',
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
                            model: 'claude-sonnet-5',
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

        it('should fallback to unknown when model is absent from llm_usage', async () => {
            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockResolvedValueOnce([]),
                }),
            });

            const volksAiResponse = {
                job_id: 'breq_fresh_no_model',
                requirements: [],
                llm_usage: {
                    input_tokens: 100,
                    output_tokens: 50,
                    total_tokens: 150,
                    estimated_cost_usd: 0.001,
                },
            };

            jest.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValueOnce(volksAiResponse),
            } as any);

            await service.analyzeForTender(1175, false, 99);

            expect(mockClaudeUsageService.recordUsage).toHaveBeenCalledWith(
                expect.objectContaining({
                    usage: {
                        stages: {
                            bidding_requirements: expect.objectContaining({
                                model: 'unknown',
                            }),
                        },
                    },
                }),
            );
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

    describe('getCachedAnalysis - page-load cache read (never calls VolksAI)', () => {
        const currentCache = {
            jobId: 'breq_cached_kochi',
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
            llmUsage: { input_tokens: 60000, output_tokens: 3000 },
            schemaVersion: 1,
            annexures: [],
            rejectedAnnexures: [],
            truncated: false,
        };

        const mockExtractionRow = (fields: unknown) =>
            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockResolvedValueOnce(fields === undefined ? [] : [{ tenderId: 1175, fields }]),
                }),
            });

        it('returns the current cached analysis without calling VolksAI or recording usage', async () => {
            mockExtractionRow({ biddingRequirementsAnalysis: currentCache, otherField: 'x' });
            const fetchSpy = jest.spyOn(global, 'fetch');

            const result = await service.getCachedAnalysis(1175);

            expect(result).toEqual(currentCache);
            expect(fetchSpy).not.toHaveBeenCalled();
            expect(mockClaudeUsageService.recordUsage).not.toHaveBeenCalled();
            expect(mockDb.insert).not.toHaveBeenCalled();
        });

        it('returns null (and still does not call VolksAI) when the tender has never been analysed', async () => {
            mockExtractionRow(undefined);
            const fetchSpy = jest.spyOn(global, 'fetch');

            await expect(service.getCachedAnalysis(1175)).resolves.toBeNull();
            expect(fetchSpy).not.toHaveBeenCalled();
            expect(mockDb.insert).not.toHaveBeenCalled();
        });

        it('returns null for a stale (pre-schemaVersion) cache entry instead of serving old-shape data', async () => {
            mockExtractionRow({ biddingRequirementsAnalysis: { jobId: 'old', requirements: [], llmUsage: null } });
            const fetchSpy = jest.spyOn(global, 'fetch');

            await expect(service.getCachedAnalysis(1175)).resolves.toBeNull();
            expect(fetchSpy).not.toHaveBeenCalled();
        });
    });

    describe('analyzeForTender - in-flight de-duplication (Fix 3)', () => {
        const volksAiResponse = {
            schemaVersion: 1,
            job_id: 'breq_single_dispatch',
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
            annexures: [],
            llm_usage: { input_tokens: 60000, output_tokens: 3000, estimated_cost_usd: 0.23 },
        };
        const okResponse = () => ({ ok: true, status: 200, json: async () => volksAiResponse }) as any;

        /** fetch that stays pending until release() -- lets two requests genuinely overlap. */
        const deferredFetch = () => {
            let release!: () => void;
            const spy = jest.spyOn(global, 'fetch').mockImplementation(
                () => new Promise((resolve) => { release = () => resolve(okResponse()); }) as any,
            );
            return { spy, release: () => release() };
        };
        /** Wait (real I/O included) until `spy` has been called `n` times, or give up after ~2s. */
        const waitForCalls = async (spy: jest.SpyInstance, n: number) => {
            for (let i = 0; i < 400 && spy.mock.calls.length < n; i++) {
                await new Promise((r) => setTimeout(r, 5));
            }
        };
        /** A little extra settling so a would-be second dispatch has every chance to happen. */
        const settle = () => new Promise((r) => setTimeout(r, 50));

        it('two concurrent calls for the same tender -> one VolksAI dispatch, one usage row, same result', async () => {
            const { spy, release } = deferredFetch();

            const first = service.analyzeForTender(1175, false, 11);
            const second = service.analyzeForTender(1175, false, 22);
            await waitForCalls(spy, 1);
            await settle();
            expect(spy).toHaveBeenCalledTimes(1);          // second call did not dispatch its own

            release();
            const [a, b] = await Promise.all([first, second]);

            expect(spy).toHaveBeenCalledTimes(1);
            expect(mockClaudeUsageService.recordUsage).toHaveBeenCalledTimes(1);
            expect(mockDb.insert).toHaveBeenCalledTimes(1);
            expect(a).toEqual(b);
            expect(a.jobId).toBe('breq_single_dispatch');
        });

        it('a forceRefresh click during a running analysis joins it instead of starting another', async () => {
            const { spy, release } = deferredFetch();
            const first = service.analyzeForTender(1175, false, 11);
            const reanalyze = service.analyzeForTender(1175, true, 11);
            await waitForCalls(spy, 1);
            await settle();
            release();
            await Promise.all([first, reanalyze]);
            expect(spy).toHaveBeenCalledTimes(1);
        });

        it('does not de-duplicate across different tenders', async () => {
            jest.spyOn(global, 'fetch').mockResolvedValue(okResponse());
            await Promise.all([service.analyzeForTender(1175), service.analyzeForTender(2001)]);
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });

        it('clears the in-flight entry after completion, so a later analysis is not blocked', async () => {
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(okResponse());
            await service.analyzeForTender(1175, true);
            await service.analyzeForTender(1175, true);
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });

        it('a failed dispatch rejects both waiting callers and is cleared for the next attempt', async () => {
            let fail!: (e: Error) => void;
            const fetchSpy = jest.spyOn(global, 'fetch').mockImplementationOnce(
                () => new Promise((_, reject) => { fail = reject; }) as any,
            );
            const first = service.analyzeForTender(1175);
            const second = service.analyzeForTender(1175);
            await waitForCalls(fetchSpy, 1);
            await settle();
            fail(new Error('VolksAI down'));
            await expect(first).rejects.toThrow('VolksAI down');
            await expect(second).rejects.toThrow('VolksAI down');

            fetchSpy.mockResolvedValueOnce(okResponse());
            await expect(service.analyzeForTender(1175)).resolves.toMatchObject({ jobId: 'breq_single_dispatch' });
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });

        describe('cross-process Redis lock', () => {
            const makeService = (redis: any) =>
                new BiddingRequirementsService(
                    mockAppLogger, mockDb, mockConfigService, mockFileUploadService, mockTenderInfosService,
                    mockTenderInfoSheetsService, mockFinanceDocumentsService, mockClaudeUsageService, redis,
                );

            afterEach(() => jest.useRealTimers());

            it('acquires the tender lock, dispatches once, then releases only its own lock', async () => {
                const redis = {
                    status: 'ready',
                    set: jest.fn().mockResolvedValue('OK'),
                    eval: jest.fn().mockResolvedValue(1),
                    exists: jest.fn(),
                };
                jest.spyOn(global, 'fetch').mockResolvedValue(okResponse());

                const result = await makeService(redis).analyzeForTender(1175);

                expect(result.jobId).toBe('breq_single_dispatch');
                expect(global.fetch).toHaveBeenCalledTimes(1);
                const [key, token, px, ttl, nx] = redis.set.mock.calls[0];
                expect([key, px, nx]).toEqual(['bidding-requirements:lock:1175', 'PX', 'NX']);
                expect(ttl).toBe(BIDDING_REQUIREMENTS_LOCK_TTL_MS);
                expect(redis.eval).toHaveBeenCalledWith(expect.stringContaining("redis.call('del'"), 1, key, token);
            });

            it('when another process holds the lock: waits, returns its cached result, never dispatches', async () => {
                jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
                const redis = {
                    status: 'ready',
                    set: jest.fn().mockResolvedValue(null),        // lock held elsewhere
                    exists: jest.fn().mockResolvedValue(0),        // ...and released on first poll
                    eval: jest.fn(),
                };
                const cachedByOtherProcess = {
                    jobId: 'breq_other_process', requirements: [], llmUsage: null,
                    schemaVersion: 1, annexures: [], rejectedAnnexures: [], truncated: false,
                };
                mockDb.select
                    .mockReturnValueOnce({ from: () => ({ where: async () => [] }) })   // cache miss on entry
                    .mockReturnValueOnce({ from: () => ({ where: async () => [{ tenderId: 1175, fields: { biddingRequirementsAnalysis: cachedByOtherProcess } }] }) });
                const fetchSpy = jest.spyOn(global, 'fetch');

                const pending = makeService(redis).analyzeForTender(1175, false, 5);
                await jest.advanceTimersByTimeAsync(BIDDING_REQUIREMENTS_LOCK_POLL_MS);
                const result = await pending;

                expect(result.jobId).toBe('breq_other_process');
                expect(fetchSpy).not.toHaveBeenCalled();
                expect(mockClaudeUsageService.recordUsage).not.toHaveBeenCalled();
                expect(redis.eval).not.toHaveBeenCalled();         // never touches a lock it doesn't own
            });

            it('falls back to in-process de-duplication when Redis is not connected', async () => {
                const redis = { status: 'reconnecting', set: jest.fn(), eval: jest.fn(), exists: jest.fn() };
                jest.spyOn(global, 'fetch').mockResolvedValue(okResponse());
                await makeService(redis).analyzeForTender(1175);
                expect(redis.set).not.toHaveBeenCalled();
                expect(global.fetch).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('startOrGetAnalysis - Job Lifecycle & Idempotency', () => {
        beforeEach(() => {
            mockDb.execute = jest.fn().mockResolvedValue([]);
        });

        it('returns saved result immediately without LLM call when job is done and !forceRefresh', async () => {
            const savedResult = {
                jobId: 'breq_saved_123',
                requirements: [{ documentName: 'PAN', category: 'standard', required: true }],
                annexures: [],
                schemaVersion: 1,
            };
            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockResolvedValueOnce([
                        {
                            id: 42,
                            tenderId: 1175,
                            documentHash: 'hash123',
                            status: 'done',
                            result: savedResult,
                        },
                    ]),
                }),
            });
            const fetchSpy = jest.spyOn(global, 'fetch');

            const res = await service.startOrGetAnalysis(1175, false);

            expect(res.jobId).toBe(42);
            expect(res.status).toBe('done');
            expect(res.analysis).toEqual(savedResult);
            expect(fetchSpy).not.toHaveBeenCalled();
        });

        it('joins in-flight job without starting duplicate job when status is running or pending', async () => {
            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockResolvedValueOnce([
                        {
                            id: 43,
                            tenderId: 1175,
                            documentHash: 'hash123',
                            status: 'running',
                            startedAt: new Date(),
                            heartbeatAt: new Date(),
                            result: null,
                        },
                    ]),
                }),
            });
            const fetchSpy = jest.spyOn(global, 'fetch');

            const res = await service.startOrGetAnalysis(1175, false);

            expect(res.jobId).toBe(43);
            expect(res.status).toBe('running');
            expect(fetchSpy).not.toHaveBeenCalled();
        });

        it('double-click makes one LLM call (concurrent calls join the same in-flight job)', async () => {
            let activeJob: any = null;
            mockDb.select.mockImplementation(() => ({
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockImplementation(() => {
                        return Promise.resolve(activeJob ? [activeJob] : []);
                    }),
                }),
            }));

            mockDb.insert.mockImplementation(() => ({
                values: jest.fn().mockReturnValue({
                    onConflictDoUpdate: jest.fn().mockReturnValue({
                        returning: jest.fn().mockImplementation(() => {
                            activeJob = {
                                id: 99,
                                tenderId: 1175,
                                documentHash: 'hash_test',
                                status: 'pending',
                                startedAt: new Date(),
                                heartbeatAt: new Date(),
                                result: null,
                            };
                            return Promise.resolve([activeJob]);
                        }),
                    }),
                }),
            }));

            const executeSpy = jest.spyOn(service as any, 'executeJobInBackground').mockResolvedValue(undefined);

            const [call1, call2] = await Promise.all([
                service.startOrGetAnalysis(1175, false),
                service.startOrGetAnalysis(1175, false),
            ]);

            expect(call1.jobId).toBe(99);
            expect(call2.jobId).toBe(99);
            expect(executeSpy).toHaveBeenCalledTimes(1);
        });

        it('failed job can be retried by restarting analysis', async () => {
            const failedJob = {
                id: 44,
                tenderId: 1175,
                documentHash: 'hash123',
                status: 'failed',
                errorCode: 'ANALYSIS_FAILED',
                errorMessage: 'Previous attempt failed',
                result: null,
                startedAt: new Date(Date.now() - 60000),
                heartbeatAt: new Date(Date.now() - 60000),
            };

            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockResolvedValueOnce([failedJob]),
                }),
            });

            const resetJob = {
                ...failedJob,
                status: 'pending',
                errorCode: null,
                errorMessage: null,
            };

            mockDb.update = jest.fn().mockReturnValue({
                set: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        returning: jest.fn().mockResolvedValue([resetJob]),
                    }),
                }),
            });

            const executeSpy = jest.spyOn(service as any, 'executeJobInBackground').mockResolvedValue(undefined);

            const res = await service.startOrGetAnalysis(1175, false);

            expect(res.jobId).toBe(44);
            expect(res.status).toBe('pending');
            expect(executeSpy).toHaveBeenCalledWith(
                44,
                1175,
                expect.any(Object),
                expect.any(Object),
                expect.any(String),
                undefined,
            );
        });

        describe('Heartbeat & Dead Job Detection (60s threshold)', () => {
            it('treats a running job with heartbeat younger than 60s as alive', () => {
                const freshJob: any = {
                    id: 46,
                    status: 'running',
                    startedAt: new Date(Date.now() - 45_000),
                    heartbeatAt: new Date(Date.now() - 45_000), // 45s ago: alive
                };
                expect(service.isJobStuck(freshJob)).toBe(false);
            });

            it('treats a running job with heartbeat older than 60s as dead', () => {
                const deadJob: any = {
                    id: 47,
                    status: 'running',
                    startedAt: new Date(Date.now() - 65_000),
                    heartbeatAt: new Date(Date.now() - 65_000), // 65s ago: dead
                };
                expect(service.isJobStuck(deadJob)).toBe(true);
            });

            it('getJobStatus marks dead running job as failed when API restarts while job was running', async () => {
                // Simulated state: node process restarted 70s ago while job was running; heartbeat was never updated again
                const crashedJob = {
                    id: 48,
                    tenderId: 1175,
                    documentHash: 'hash789',
                    status: 'running',
                    startedAt: new Date(Date.now() - 70_000),
                    heartbeatAt: new Date(Date.now() - 70_000),
                    result: null,
                    errorCode: null,
                    errorMessage: null,
                };

                const failedJob = {
                    ...crashedJob,
                    status: 'failed',
                    errorCode: 'ANALYSIS_TIMEOUT',
                    errorMessage: 'Analysis job heartbeat stalled (>60s) or server restarted while job was in-flight',
                };

                mockDb.select.mockReturnValueOnce({
                    from: jest.fn().mockReturnValueOnce({
                        where: jest.fn().mockReturnValueOnce({
                            orderBy: jest.fn().mockReturnValueOnce({
                                limit: jest.fn().mockResolvedValueOnce([crashedJob]),
                            }),
                        }),
                    }),
                });

                mockDb.update = jest.fn().mockReturnValueOnce({
                    set: jest.fn().mockReturnValueOnce({
                        where: jest.fn().mockReturnValueOnce({
                            returning: jest.fn().mockResolvedValueOnce([failedJob]),
                        }),
                    }),
                });

                const res = await service.getJobStatus(1175);

                expect(res.jobId).toBe(48);
                expect(res.status).toBe('failed');
                expect(res.error?.code).toBe('ANALYSIS_TIMEOUT');
                expect(res.error?.message).toContain('heartbeat stalled (>60s)');
            });
        });

        it('stuck job from API restart or timeout (>60s heartbeat) is marked failed and may be retried', async () => {
            const stuckJob = {
                id: 45,
                tenderId: 1175,
                documentHash: 'hash123',
                status: 'running',
                result: null,
                startedAt: new Date(Date.now() - 65_000), // 65s > 60s threshold
                heartbeatAt: new Date(Date.now() - 65_000),
            };

            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockResolvedValueOnce([stuckJob]),
                }),
            });

            const markedFailedJob = {
                ...stuckJob,
                status: 'failed',
                errorCode: 'ANALYSIS_TIMEOUT',
                errorMessage: 'Analysis job heartbeat stalled (>60s) or server restarted while job was in-flight',
            };

            const retriedJob = {
                ...stuckJob,
                status: 'pending',
                startedAt: new Date(),
                heartbeatAt: new Date(),
            };

            mockDb.update = jest.fn()
                .mockReturnValueOnce({
                    set: jest.fn().mockReturnValueOnce({
                        where: jest.fn().mockReturnValueOnce({
                            returning: jest.fn().mockResolvedValueOnce([markedFailedJob]),
                        }),
                    }),
                })
                .mockReturnValueOnce({
                    set: jest.fn().mockReturnValueOnce({
                        where: jest.fn().mockReturnValueOnce({
                            returning: jest.fn().mockResolvedValueOnce([retriedJob]),
                        }),
                    }),
                });

            const executeSpy = jest.spyOn(service as any, 'executeJobInBackground').mockResolvedValue(undefined);

            const res = await service.startOrGetAnalysis(1175, false);

            expect(res.jobId).toBe(45);
            expect(res.status).toBe('pending');
            expect(executeSpy).toHaveBeenCalledWith(
                45,
                1175,
                expect.any(Object),
                expect.any(Object),
                expect.any(String),
                undefined,
            );
        });
    });

    describe('HttpException mapping & code reporting', () => {
        it('throws BadGatewayException with code VOLKSAI_UNREACHABLE when fetch throws network error', async () => {
            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockResolvedValueOnce([]),
                }),
            });
            jest.spyOn(global, 'fetch').mockRejectedValueOnce(new TypeError('fetch failed'));

            await expect(service.analyzeForTender(1175, true)).rejects.toThrow(BadGatewayException);
            try {
                mockDb.select.mockReturnValueOnce({
                    from: jest.fn().mockReturnValueOnce({
                        where: jest.fn().mockResolvedValueOnce([]),
                    }),
                });
                jest.spyOn(global, 'fetch').mockRejectedValueOnce(new TypeError('fetch failed'));
                await service.analyzeForTender(1175, true);
            } catch (err: any) {
                expect(err.getResponse()).toMatchObject({
                    code: 'VOLKSAI_UNREACHABLE',
                });
            }
        });

        it('throws GatewayTimeoutException with code ANALYSIS_TIMEOUT when request aborts due to timeout', async () => {
            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockResolvedValueOnce([]),
                }),
            });
            const timeoutError = new Error('The operation was aborted due to timeout');
            timeoutError.name = 'TimeoutError';
            jest.spyOn(global, 'fetch').mockRejectedValueOnce(timeoutError);

            try {
                await service.analyzeForTender(1175, true);
                fail('Expected GatewayTimeoutException');
            } catch (err: any) {
                expect(err).toBeInstanceOf(GatewayTimeoutException);
                expect(err.getResponse()).toMatchObject({
                    code: 'ANALYSIS_TIMEOUT',
                });
            }
        });

        it('throws ServiceUnavailableException with code LLM_UNAVAILABLE when VolksAI reports Claude issue', async () => {
            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockResolvedValueOnce([]),
                }),
            });
            jest.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: false,
                status: 503,
                text: jest.fn().mockResolvedValueOnce('ANTHROPIC_API_KEY credit_balance_too_low'),
            } as any);

            try {
                await service.analyzeForTender(1175, true);
                fail('Expected ServiceUnavailableException');
            } catch (err: any) {
                expect(err).toBeInstanceOf(ServiceUnavailableException);
                expect(err.getResponse()).toMatchObject({
                    code: 'LLM_UNAVAILABLE',
                });
            }
        });

        it('throws BadGatewayException with code ANALYSIS_FAILED on generic upstream failure', async () => {
            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockResolvedValueOnce([]),
                }),
            });
            jest.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: jest.fn().mockResolvedValueOnce('Internal error inside VolksAI pipeline'),
            } as any);

            try {
                await service.analyzeForTender(1175, true);
                fail('Expected BadGatewayException');
            } catch (err: any) {
                expect(err).toBeInstanceOf(BadGatewayException);
                expect(err.getResponse()).toMatchObject({
                    code: 'ANALYSIS_FAILED',
                });
            }
        });
    });
});

