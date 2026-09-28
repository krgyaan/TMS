jest.mock('uuid', () => ({
    v4: () => 'mock-uuid-v4',
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BiddingRequirementsService } from './bidding-requirements.service';
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
});
