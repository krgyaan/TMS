import { PdfExtractionProducer } from './pdf-extraction.producer';
import { PdfExtractionProcessor } from './pdf-extraction.processor';
import { PdfExtractionJobData, PdfExtractionJobResult } from './types/pdf-extraction.types';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('uuid', () => ({
    v4: () => 'mock-uuid-v4',
}));


describe('PDF Extraction Queue Integration (Phase 8)', () => {
    let mockQueue: any;
    let mockLogger: any;
    let mockConfigService: any;
    let mockFileUploadService: any;

    beforeEach(() => {
        mockQueue = {
            getJob: jest.fn(),
            add: jest.fn(),
        };

        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        mockConfigService = {
            get: jest.fn((key: string) => {
                switch (key) {
                    case 'redis.host':
                        return '127.0.0.1';
                    case 'redis.port':
                        return 6379;
                    case 'volksAi.serviceUrl':
                        return 'http://localhost:8001';
                    case 'volksAi.timeoutMs':
                        return 120000;
                    default:
                        return undefined;
                }
            }),
        };

        mockFileUploadService = {
            getAbsolutePath: jest.fn((filePath: string) => `/uploads/${filePath}`),
        };
    });

    describe('PdfExtractionProducer', () => {
        let producer: PdfExtractionProducer;
        const tempProducerPdf = path.join(__dirname, 'temp_producer_test.pdf');
        const tempProducerAtc = path.join(__dirname, 'temp_producer_atc.pdf');

        beforeAll(() => {
            fs.writeFileSync(tempProducerPdf, '%PDF-1.4 producer test');
            fs.writeFileSync(tempProducerAtc, '%PDF-1.4 producer atc');
        });

        afterAll(() => {
            if (fs.existsSync(tempProducerPdf)) fs.unlinkSync(tempProducerPdf);
            if (fs.existsSync(tempProducerAtc)) fs.unlinkSync(tempProducerAtc);
        });

        beforeEach(() => {
            producer = new PdfExtractionProducer(mockQueue, mockLogger);
        });

        it('should enqueue a new job with deterministic jobId and attempts: 1', async () => {
            mockQueue.getJob.mockResolvedValue(null);
            mockQueue.add.mockResolvedValue({ id: 'extract-tender-101' });

            const jobData: PdfExtractionJobData = {
                tenderId: 101,
                pdfPath: 'tenders/gem_101.pdf',
                userId: 42,
            };

            const result = await producer.enqueueExtraction(jobData);

            expect(result).toEqual({
                jobId: 'extract-tender-101',
                status: 'enqueued',
            });

            expect(mockQueue.getJob).toHaveBeenCalledWith('extract-tender-101');
            expect(mockQueue.add).toHaveBeenCalledWith(
                'extract-pdf',
                jobData,
                expect.objectContaining({
                    jobId: 'extract-tender-101',
                    attempts: 1,
                    backoff: {
                        type: 'exponential',
                        delay: 5000,
                    },
                    removeOnComplete: {
                        age: 86400,
                        count: 1000,
                    },
                }),
            );
        });

        it('should deduplicate and return existing_active if job is already active or waiting', async () => {
            const mockExistingJob = {
                id: 'extract-tender-101',
                getState: jest.fn().mockResolvedValue('active'),
                remove: jest.fn(),
            };
            mockQueue.getJob.mockResolvedValue(mockExistingJob);

            const jobData: PdfExtractionJobData = {
                tenderId: 101,
                pdfPath: 'tenders/gem_101.pdf',
                userId: 42,
            };

            const result = await producer.enqueueExtraction(jobData);

            expect(result).toEqual({
                jobId: 'extract-tender-101',
                status: 'existing_active',
            });

            expect(mockExistingJob.remove).not.toHaveBeenCalled();
            expect(mockQueue.add).not.toHaveBeenCalled();
        });

        it('should return existing_completed and preserve cache to prevent token burn when force is not set', async () => {
            const mockExistingJob = {
                id: 'extract-tender-101',
                getState: jest.fn().mockResolvedValue('completed'),
                remove: jest.fn().mockResolvedValue(undefined),
                returnvalue: { fields: { tenderValue: { value: 1000 } } },
            };
            mockQueue.getJob.mockResolvedValue(mockExistingJob);

            const jobData: PdfExtractionJobData = {
                tenderId: 101,
                pdfPath: tempProducerPdf,
                userId: 42,
            };

            const result = await producer.enqueueExtraction(jobData);

            expect(result).toEqual({
                jobId: 'extract-tender-101',
                status: 'existing_completed',
                fields: { tenderValue: { value: 1000 } },
                missing_fields: undefined,
            });

            expect(mockExistingJob.remove).not.toHaveBeenCalled();
            expect(mockQueue.add).not.toHaveBeenCalled();
        });

        it('should remove old completed job and re-enqueue when force: true is specified', async () => {
            const mockExistingJob = {
                id: 'extract-tender-101',
                getState: jest.fn().mockResolvedValue('completed'),
                remove: jest.fn().mockResolvedValue(undefined),
            };
            mockQueue.getJob.mockResolvedValue(mockExistingJob);
            mockQueue.add.mockResolvedValue({ id: 'extract-tender-101' });

            const jobData: PdfExtractionJobData = {
                tenderId: 101,
                pdfPath: 'tenders/gem_101.pdf',
                userId: 42,
                force: true,
            };

            const result = await producer.enqueueExtraction(jobData);

            expect(result).toEqual({
                jobId: 'extract-tender-101',
                status: 'enqueued',
            });

            expect(mockExistingJob.remove).toHaveBeenCalled();
            expect(mockQueue.add).toHaveBeenCalledWith(
                'extract-pdf',
                jobData,
                expect.objectContaining({ jobId: 'extract-tender-101' }),
            );
        });

        it('should re-enqueue a new job when ATC file changes because document hash no longer matches stale cache', async () => {
            const initialData: PdfExtractionJobData = {
                tenderId: 101,
                pdfPath: 'tenders/gem_101.pdf',
                mainTenderPath: 'tenders/gem_101.pdf',
                atcPaths: ['tenders/old_atc.pdf'],
                userId: 42,
            };

            const oldHash = await producer.computeDocumentHash(initialData);
            const oldVersion = `1.0.0:${oldHash.slice(0, 32)}`;

            const mockDb: any = {
                select: jest.fn().mockReturnValue({
                    from: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnValue({
                            limit: jest.fn().mockResolvedValue([
                                {
                                    id: 1,
                                    tenderId: 101,
                                    fields: { tenderValue: { value: 500 } },
                                    extractionVersion: oldVersion,
                                    missingFields: [],
                                },
                            ]),
                        }),
                    }),
                }),
            };

            const producerWithDb = new PdfExtractionProducer(
                mockQueue,
                mockLogger,
                undefined,
                undefined,
                mockDb,
            );

            mockQueue.getJob.mockResolvedValue(null);
            mockQueue.add.mockResolvedValue({ id: 'extract-tender-101' });

            // Call with changed ATC file
            const changedData: PdfExtractionJobData = {
                tenderId: 101,
                pdfPath: 'tenders/gem_101.pdf',
                mainTenderPath: 'tenders/gem_101.pdf',
                atcPaths: ['tenders/new_atc.pdf'],
                userId: 42,
            };

            const result = await producerWithDb.enqueueExtraction(changedData);

            expect(result).toEqual({
                jobId: 'extract-tender-101',
                status: 'enqueued',
            });
            expect(mockQueue.add).toHaveBeenCalledWith(
                'extract-pdf',
                changedData,
                expect.any(Object),
            );
        });

        it('should return existing_completed from DB cache when ATC file and hash match', async () => {
            const data: PdfExtractionJobData = {
                tenderId: 101,
                pdfPath: tempProducerPdf,
                mainTenderPath: tempProducerPdf,
                atcPaths: [tempProducerAtc],
                userId: 42,
            };

            const hash = await producer.computeDocumentHash(data);
            const matchingVersion = `1.0.0:${hash.slice(0, 32)}`;

            const mockDb: any = {
                select: jest.fn().mockReturnValue({
                    from: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnValue({
                            limit: jest.fn().mockResolvedValue([
                                {
                                    id: 1,
                                    tenderId: 101,
                                    fields: { tenderValue: { value: 500 } },
                                    extractionVersion: matchingVersion,
                                    missingFields: [],
                                },
                            ]),
                        }),
                    }),
                }),
            };

            const producerWithDb = new PdfExtractionProducer(
                mockQueue,
                mockLogger,
                undefined,
                undefined,
                mockDb,
            );

            const result = await producerWithDb.enqueueExtraction(data);

            expect(result.status).toBe('existing_completed');
            expect(mockQueue.add).not.toHaveBeenCalled();
        });

        it('should log warning with file name only when file is missing/unreadable, mark non-cacheable, and always enqueue', async () => {
            const data: PdfExtractionJobData = {
                tenderId: 202,
                pdfPath: 'nonexistent/secret_tender_doc.pdf',
                userId: 42,
            };

            const hash = await producer.computeDocumentHash(data);
            expect(typeof hash).toBe('string');
            expect(data.isNonCacheable).toBe(true);

            // Log warning must contain file name only, no directory path, no content
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('secret_tender_doc.pdf'),
            );
            expect(mockLogger.warn).not.toHaveBeenCalledWith(
                expect.stringContaining('nonexistent/secret_tender_doc.pdf'),
            );

            // Even if DB has a matching extractionVersion, because isNonCacheable=true, it MUST NOT return existing_completed
            const matchingVersion = `1.0.0:${hash.slice(0, 32)}`;
            const mockDb: any = {
                select: jest.fn().mockReturnValue({
                    from: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnValue({
                            limit: jest.fn().mockResolvedValue([
                                {
                                    id: 1,
                                    tenderId: 202,
                                    fields: { tenderValue: { value: 500 } },
                                    extractionVersion: matchingVersion,
                                },
                            ]),
                        }),
                    }),
                }),
            };

            mockQueue.getJob.mockResolvedValue(null);
            mockQueue.add.mockResolvedValue({ id: 'extract-tender-202' });

            const producerWithDb = new PdfExtractionProducer(
                mockQueue,
                mockLogger,
                undefined,
                undefined,
                mockDb,
            );

            const result = await producerWithDb.enqueueExtraction(data);

            // Must NOT return existing_completed, must enqueue fresh job
            expect(result.status).toBe('enqueued');
            expect(mockQueue.add).toHaveBeenCalled();
        });

        it('should return job status, returnvalue result, and failed reason', async () => {
            mockQueue.getJob.mockResolvedValue({
                id: 'extract-tender-101',
                getState: jest.fn().mockResolvedValue('completed'),
                progress: 100,
                data: { tenderId: 101 },
                returnvalue: {
                    extraction_version: '1.0.0',
                    fields: { emdAmount: { value: 50000, confidence: 'high', source: 'regex' } },
                    missing_fields: [],
                    processing_time_ms: 1250,
                },
                failedReason: null,
            });

            const status = await producer.getJobStatus('extract-tender-101');

            expect(status).toEqual({
                jobId: 'extract-tender-101',
                state: 'completed',
                progress: 100,
                data: { tenderId: 101 },
                result: expect.objectContaining({
                    extraction_version: '1.0.0',
                    processing_time_ms: 1250,
                }),
                failedReason: null,
            });
        });

        it('should return null if job does not exist', async () => {
            mockQueue.getJob.mockResolvedValue(null);

            const status = await producer.getJobStatus('non-existent');
            expect(status).toBeNull();
        });
    });

    describe('PdfExtractionProcessor', () => {
        let processor: PdfExtractionProcessor;
        const tempTestDir = path.join(__dirname, 'temp_test_pdf');
        const tempPdfFile = path.join(tempTestDir, 'sample_tender.pdf');

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

        beforeEach(() => {
            const mockClaudeUsageService = {
                recordUsage: jest.fn().mockResolvedValue(undefined),
                recordTpmEntry: jest.fn().mockResolvedValue(undefined),
                getCurrentTpm: jest.fn().mockResolvedValue(0),
            };

            processor = new PdfExtractionProcessor(
                mockConfigService,
                mockFileUploadService,
                mockClaudeUsageService as any,
                mockLogger,
            );
        });


        it('should resolve absolute paths directly or through FileUploadService', () => {
            const abs = processor.resolvePdfPath(tempPdfFile);
            expect(abs).toBe(tempPdfFile);

            mockFileUploadService.getAbsolutePath.mockReturnValue(tempPdfFile);
            const relResolved = processor.resolvePdfPath('relative/tender.pdf');
            expect(relResolved).toBe(tempPdfFile);
        });

        it('should fail with clear error if PDF file is missing on disk', async () => {
            mockFileUploadService.getAbsolutePath.mockReturnValue('/non/existent/path/tender.pdf');

            const mockJob: any = {
                id: 'extract-tender-999',
                data: {
                    tenderId: 999,
                    pdfPath: 'missing.pdf',
                    userId: 1,
                },
            };

            await expect(
                processor.processJob(mockJob, 'http://localhost:8001', 120000),
            ).rejects.toThrow(/PDF file not found at path/);
        });

        it('should post multipart/form-data to /extract and return result without database persistence', async () => {
            const mockExtractionResult: PdfExtractionJobResult = {
                extraction_version: '1.0.0',
                fields: {
                    emdAmount: { value: 100000, confidence: 'high', source: 'regex' },
                    processingFeeAmount: { value: null, confidence: 'not_applicable', source: null },
                },
                missing_fields: ['tenderValue'],
                processing_time_ms: 1542,
            };

            // Mock global fetch
            const originalFetch = global.fetch;
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockExtractionResult,
            } as any);

            try {
                const mockJob: any = {
                    id: 'extract-tender-101',
                    data: {
                        tenderId: 101,
                        pdfPath: tempPdfFile,
                        userId: 1,
                    },
                };

                const result = await processor.processJob(mockJob, 'http://localhost:8001', 120000);

                expect(global.fetch).toHaveBeenCalledWith(
                    'http://localhost:8001/extract',
                    expect.objectContaining({
                        method: 'POST',
                        body: expect.any(FormData),
                    }),
                );

                expect(result).toEqual(mockExtractionResult);
            } finally {
                global.fetch = originalFetch;
            }
        });

        it('should catch timeout and throw clear actionable timeout error', async () => {
            const originalFetch = global.fetch;
            const timeoutError = new Error('The operation was aborted');
            timeoutError.name = 'TimeoutError';
            global.fetch = jest.fn().mockRejectedValue(timeoutError);

            try {
                const mockJob: any = {
                    id: 'extract-tender-101',
                    data: {
                        tenderId: 101,
                        pdfPath: tempPdfFile,
                        userId: 1,
                    },
                };

                await expect(
                    processor.processJob(mockJob, 'http://localhost:8001', 5000),
                ).rejects.toThrow(/VolksAI extraction service timed out after 5000ms/);
            } finally {
                global.fetch = originalFetch;
            }
        });

        it('should handle HTTP error status and throw actionable error', async () => {
            const originalFetch = global.fetch;
            global.fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                text: async () => 'PDF parsing failed on corrupt stream',
            } as any);

            try {
                const mockJob: any = {
                    id: 'extract-tender-101',
                    data: {
                        tenderId: 101,
                        pdfPath: tempPdfFile,
                        userId: 1,
                    },
                };

                await expect(
                    processor.processJob(mockJob, 'http://localhost:8001', 120000),
                ).rejects.toThrow(/VolksAI extraction failed with HTTP 500/);
            } finally {
                global.fetch = originalFetch;
            }
        });

        it('should log structured fallback recovery and throw EXTRACTION_SAVE_FAILED when DB persistence fails', async () => {
            const mockExtractionResult: PdfExtractionJobResult = {
                extraction_version: '1.0.0',
                fields: {
                    tenderValue: { value: 5000000, confidence: 'high', source: 'regex' },
                    emdAmount: { value: 100000, confidence: 'high', source: 'regex' },
                },
                missing_fields: ['processingFeeAmount'],
                processing_time_ms: 1200,
            };

            const originalFetch = global.fetch;
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockExtractionResult,
            } as any);

            const mockDb: any = {
                insert: jest.fn().mockReturnValue({
                    values: jest.fn().mockReturnValue({
                        onConflictDoUpdate: jest.fn().mockRejectedValue(new Error('relation "tender_extractions" does not exist')),
                    }),
                }),
                select: jest.fn(),
            };

            const processorWithFailingDb = new PdfExtractionProcessor(
                mockConfigService,
                mockFileUploadService,
                { recordUsage: jest.fn(), recordTpmEntry: jest.fn(), getCurrentTpm: jest.fn() } as any,
                mockLogger,
                mockDb,
            );

            try {
                const mockJob: any = {
                    id: 'extract-tender-3665',
                    data: {
                        tenderId: 3665,
                        pdfPath: tempPdfFile,
                        userId: 42,
                    },
                };

                await expect(
                    processorWithFailingDb.processJob(mockJob, 'http://localhost:8001', 120000),
                ).rejects.toThrow(/EXTRACTION_SAVE_FAILED: Failed to persist extraction result for tender 3665/);

                // Verify error was logged with [EXTRACTION_FALLBACK_RECOVERY] containing raw extraction
                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining('[EXTRACTION_FALLBACK_RECOVERY]'),
                    expect.objectContaining({
                        action: 'save_failure_fallback_logged',
                        tenderId: 3665,
                        jobId: 'extract-tender-3665',
                        fallbackRecoveryPayload: expect.objectContaining({
                            tag: 'EXTRACTION_FALLBACK_RECOVERY',
                            tenderId: 3665,
                            jobId: 'extract-tender-3665',
                            userId: 42,
                            error: 'relation "tender_extractions" does not exist',
                            rawExtraction: expect.objectContaining({
                                fields: mockExtractionResult.fields,
                                missing_fields: ['processingFeeAmount'],
                            }),
                        }),
                    }),
                );
            } finally {
                global.fetch = originalFetch;
            }
        });

        it('should persist metadata (llm_status and failed_categories) into tender_extractions.fields on LLM failure', async () => {
            const mockLlmFailureResult: PdfExtractionJobResult = {
                fields: {
                    tenderValue: { value: 2000000, confidence: 'high', source: 'regex' },
                },
                missing_fields: ['pbgPercentage', 'ldPercentage'],
                extraction_version: '1.0.0',
                processing_time_ms: 3200,
                llm_status: 'llm_unavailable',
                failed_categories: ['pbg_sd', 'prs_ld'],
            };

            const originalFetch = global.fetch;
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockLlmFailureResult,
            } as any);

            let persistedValues: any = null;
            const mockDb: any = {
                insert: jest.fn().mockReturnValue({
                    values: jest.fn().mockImplementation((val) => {
                        persistedValues = val;
                        return {
                            onConflictDoUpdate: jest.fn().mockResolvedValue({}),
                        };
                    }),
                }),
                select: jest.fn().mockReturnValue({
                    from: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnValue({
                            limit: jest.fn().mockImplementation(() =>
                                Promise.resolve([{
                                    id: 1,
                                    tenderId: 101,
                                    fields: persistedValues?.fields,
                                }])
                            ),
                        }),
                    }),
                }),
            };

            const processorWithDb = new PdfExtractionProcessor(
                mockConfigService,
                mockFileUploadService,
                { recordUsage: jest.fn(), recordTpmEntry: jest.fn(), getCurrentTpm: jest.fn() } as any,
                mockLogger,
                mockDb,
            );

            try {
                const mockJob: any = {
                    id: 'extract-tender-101',
                    data: { tenderId: 101, pdfPath: tempPdfFile, userId: 1 },
                };

                const result = await processorWithDb.processJob(mockJob, 'http://localhost:8001', 120000);

                expect(result.llm_status).toBe('llm_unavailable');
                expect(result.failed_categories).toEqual(['pbg_sd', 'prs_ld']);

                expect(mockDb.insert).toHaveBeenCalled();
                expect(persistedValues).not.toBeNull();
                expect(persistedValues.fields.metadata).toEqual({
                    llm_status: 'llm_unavailable',
                    failed_categories: ['pbg_sd', 'prs_ld'],
                });
                expect(persistedValues.fields.tenderValue).toEqual({
                    value: 2000000,
                    confidence: 'high',
                    source: 'regex',
                    reviewed: false,
                });
            } finally {
                global.fetch = originalFetch;
            }
        });

        it('should execute DB write inside a single transaction and flag AI values with reviewed: false', async () => {
            const mockResult: PdfExtractionJobResult = {
                fields: {
                    tenderValue: { value: 100000, confidence: 'high', source: 'regex' },
                    emdAmount: { value: 2000, confidence: 'medium', source: 'regex' },
                },
                missing_fields: [],
                extraction_version: '1.0.0',
                processing_time_ms: 1000,
                llm_status: 'ok',
                failed_categories: [],
            };

            const originalFetch = global.fetch;
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockResult,
            } as any);

            let transactionExecuted = false;
            let persistedValues: any = null;

            const mockTx: any = {
                insert: jest.fn().mockReturnValue({
                    values: jest.fn().mockImplementation((val) => {
                        persistedValues = val;
                        return {
                            onConflictDoUpdate: jest.fn().mockResolvedValue({}),
                        };
                    }),
                }),
            };

            const mockDb: any = {
                transaction: jest.fn().mockImplementation(async (callback) => {
                    transactionExecuted = true;
                    return callback(mockTx);
                }),
                select: jest.fn().mockReturnValue({
                    from: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnValue({
                            limit: jest.fn().mockImplementation(() =>
                                Promise.resolve([{
                                    id: 1,
                                    tenderId: 505,
                                    fields: persistedValues?.fields,
                                }])
                            ),
                        }),
                    }),
                }),
            };

            const processor = new PdfExtractionProcessor(
                mockConfigService,
                mockFileUploadService,
                { recordUsage: jest.fn(), recordTpmEntry: jest.fn(), getCurrentTpm: jest.fn() } as any,
                mockLogger,
                mockDb,
            );

            try {
                const mockJob: any = {
                    id: 'extract-tender-505',
                    data: { tenderId: 505, pdfPath: tempPdfFile, userId: 1 },
                };

                await processor.processJob(mockJob, 'http://localhost:8001', 120000);

                expect(mockDb.transaction).toHaveBeenCalledTimes(1);
                expect(transactionExecuted).toBe(true);
                expect(persistedValues.fields.tenderValue.reviewed).toBe(false);
                expect(persistedValues.fields.emdAmount.reviewed).toBe(false);
            } finally {
                global.fetch = originalFetch;
            }
        });

        it('should persist metadata with llm_status: ok and empty failed_categories on successful extraction', async () => {
            const mockSuccessResult: PdfExtractionJobResult = {
                fields: {
                    tenderValue: { value: 5000000, confidence: 'high', source: 'regex' },
                    pbgPercentage: { value: 5, confidence: 'high', source: 'claude' },
                },
                missing_fields: [],
                extraction_version: '1.0.0',
                processing_time_ms: 2100,
                llm_status: 'ok',
                failed_categories: [],
            };

            const originalFetch = global.fetch;
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockSuccessResult,
            } as any);

            let persistedValues: any = null;
            const mockDb: any = {
                insert: jest.fn().mockReturnValue({
                    values: jest.fn().mockImplementation((val) => {
                        persistedValues = val;
                        return {
                            onConflictDoUpdate: jest.fn().mockResolvedValue({}),
                        };
                    }),
                }),
                select: jest.fn().mockReturnValue({
                    from: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnValue({
                            limit: jest.fn().mockImplementation(() =>
                                Promise.resolve([{
                                    id: 2,
                                    tenderId: 102,
                                    fields: persistedValues?.fields,
                                }])
                            ),
                        }),
                    }),
                }),
            };

            const processorWithDb = new PdfExtractionProcessor(
                mockConfigService,
                mockFileUploadService,
                { recordUsage: jest.fn(), recordTpmEntry: jest.fn(), getCurrentTpm: jest.fn() } as any,
                mockLogger,
                mockDb,
            );

            try {
                const mockJob: any = {
                    id: 'extract-tender-102',
                    data: { tenderId: 102, pdfPath: tempPdfFile, userId: 1 },
                };

                const result = await processorWithDb.processJob(mockJob, 'http://localhost:8001', 120000);

                expect(result.llm_status).toBe('ok');
                expect(result.failed_categories).toEqual([]);

                expect(persistedValues.fields.metadata).toEqual({
                    llm_status: 'ok',
                    failed_categories: [],
                });
            } finally {
                global.fetch = originalFetch;
            }
        });

        it('should persist extended keys (requiredDocuments, doc1-doc9, miiPreference, gemBidEndDate, etc.) in tender_extractions.fields', async () => {
            const mockExtendedResult: PdfExtractionJobResult = {
                fields: {
                    tenderValue: { value: 5000000, confidence: 'high' },
                    requiredDocuments: { value: ['PAN Card', 'GST Registration'], confidence: 'high' },
                    doc1: { value: 'PAN Card', confidence: 'high' },
                    doc2: { value: 'GST Registration', confidence: 'high' },
                    doc3: { value: 'Experience Certificate', confidence: 'high' },
                    doc4: { value: null, confidence: 'missing' },
                    doc5: { value: null, confidence: 'missing' },
                    doc6: { value: null, confidence: 'missing' },
                    doc7: { value: null, confidence: 'missing' },
                    doc8: { value: null, confidence: 'missing' },
                    doc9: { value: null, confidence: 'missing' },
                    miiPreference: { value: 'YES', confidence: 'high' },
                    miiRequired: { value: 'YES', confidence: 'high' },
                    gemBidEndDate: { value: '2026-03-31 15:00:00', confidence: 'high' },
                    gemBidOpeningDate: { value: '2026-03-31 15:30:00', confidence: 'high' },
                    grievanceContact: { value: 'Nodal Officer', confidence: 'high' },
                    grievanceEmail: { value: 'grievance@dept.gov.in', confidence: 'high' },
                    ldType: { value: 'PRS', confidence: 'high' },
                },
                missing_fields: [],
                extraction_version: '1.0.0',
                processing_time_ms: 1800,
                llm_status: 'ok',
                failed_categories: [],
            };

            const originalFetch = global.fetch;
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockExtendedResult,
            } as any);

            let persistedValues: any = null;
            const mockDb: any = {
                insert: jest.fn().mockReturnValue({
                    values: jest.fn().mockImplementation((val) => {
                        persistedValues = val;
                        return {
                            onConflictDoUpdate: jest.fn().mockResolvedValue({}),
                        };
                    }),
                }),
                select: jest.fn().mockReturnValue({
                    from: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnValue({
                            limit: jest.fn().mockImplementation(() =>
                                Promise.resolve([{
                                    id: 3,
                                    tenderId: 103,
                                    fields: persistedValues?.fields,
                                }])
                            ),
                        }),
                    }),
                }),
            };

            const processorWithDb = new PdfExtractionProcessor(
                mockConfigService,
                mockFileUploadService,
                { recordUsage: jest.fn(), recordTpmEntry: jest.fn(), getCurrentTpm: jest.fn() } as any,
                mockLogger,
                mockDb,
            );

            try {
                const mockJob: any = {
                    id: 'extract-tender-103',
                    data: { tenderId: 103, pdfPath: tempPdfFile, userId: 1 },
                };

                await processorWithDb.processJob(mockJob, 'http://localhost:8001', 120000);

                expect(persistedValues.fields.metadata.llm_status).toBe('ok');
                expect(persistedValues.fields.requiredDocuments.value).toEqual(['PAN Card', 'GST Registration']);
                expect(persistedValues.fields.doc1.value).toBe('PAN Card');
                expect(persistedValues.fields.doc2.value).toBe('GST Registration');
                expect(persistedValues.fields.doc3.value).toBe('Experience Certificate');
                expect(persistedValues.fields.miiPreference.value).toBe('YES');
                expect(persistedValues.fields.miiRequired.value).toBe('YES');
                expect(persistedValues.fields.gemBidEndDate.value).toBe('2026-03-31 15:00:00');
                expect(persistedValues.fields.gemBidOpeningDate.value).toBe('2026-03-31 15:30:00');
                expect(persistedValues.fields.grievanceContact.value).toBe('Nodal Officer');
                expect(persistedValues.fields.grievanceEmail.value).toBe('grievance@dept.gov.in');
                expect(persistedValues.fields.ldType.value).toBe('PRS');
                expect(persistedValues.fields.requiredDocuments.reviewed).toBe(false);
            } finally {
                global.fetch = originalFetch;
            }
        });
    });
});


