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

        beforeEach(() => {
            producer = new PdfExtractionProducer(mockQueue, mockLogger);
        });

        it('should enqueue a new job with deterministic jobId and attempts: 2', async () => {
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
                    attempts: 2,
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

        it('should remove old completed job and re-enqueue for fresh extraction', async () => {
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
    });
});


