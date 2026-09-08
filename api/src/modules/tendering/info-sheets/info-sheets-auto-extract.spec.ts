import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TenderInfoSheetsService } from './info-sheets.service';
import { TenderInfoSheetsController } from './info-sheets.controller';

jest.mock('uuid', () => ({
    v4: () => 'mock-uuid-v4',
}));

describe('TenderInfoSheetsService Auto-Extract & Path Resolution', () => {
    let service: TenderInfoSheetsService;
    let controller: TenderInfoSheetsController;
    let mockTenderInfosService: any;
    let mockProducer: any;
    let mockLogger: any;

    beforeEach(() => {
        mockTenderInfosService = {
            validateExists: jest.fn(),
        };

        mockProducer = {
            enqueueExtraction: jest.fn(),
            getJobStatus: jest.fn(),
        };

        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        const mockAppLogger = {
            withContext: jest.fn().mockReturnValue(mockLogger),
        };

        service = new TenderInfoSheetsService(
            mockAppLogger as any,
            {} as any, // db
            {} as any, // configService
            mockTenderInfosService,
            {} as any, // tenderStatusHistoryService
            {} as any, // emailService
            {} as any, // recipientResolver
            {} as any, // timersService
            {} as any, // clientDirectorySyncService
            mockProducer,
        );

        controller = new TenderInfoSheetsController(service);
    });

    describe('resolveTenderPdfPath (branch coverage)', () => {
        const resolve = (docs: unknown) => (service as any).resolveTenderPdfPath(docs);

        it('should throw BadRequestException when documents is null, undefined, or empty', () => {
            expect(() => resolve(null)).toThrow(BadRequestException);
            expect(() => resolve(undefined)).toThrow(BadRequestException);
            expect(() => resolve('')).toThrow(BadRequestException);
            expect(() => resolve('   ')).toThrow(BadRequestException);
        });

        it('should throw BadRequestException when documents is an empty array or empty JSON array', () => {
            expect(() => resolve([])).toThrow(BadRequestException);
            expect(() => resolve('[]')).toThrow(BadRequestException);
        });

        it('should resolve .pdf from an array of file paths', () => {
            const result = resolve(['specs.docx', 'tender-documents/notice.pdf', 'boq.xlsx']);
            expect(result).toBe('tender-documents/notice.pdf');
        });

        it('should fallback to first entry if no .pdf exists in an array', () => {
            const result = resolve(['specs.docx', 'boq.xlsx']);
            expect(result).toBe('specs.docx');
        });

        it('should resolve .pdf from a JSON-stringified array', () => {
            const jsonStr = JSON.stringify(['specs.docx', 'tender-documents/notice.pdf', 'boq.xlsx']);
            const result = resolve(jsonStr);
            expect(result).toBe('tender-documents/notice.pdf');
        });

        it('should fallback to first entry if no .pdf exists in a JSON-stringified array', () => {
            const jsonStr = JSON.stringify(['specs.docx', 'boq.xlsx']);
            const result = resolve(jsonStr);
            expect(result).toBe('specs.docx');
        });

        it('should resolve .pdf from a comma-separated string', () => {
            const result = resolve('specs.docx, tender-documents/notice.pdf, boq.xlsx');
            expect(result).toBe('tender-documents/notice.pdf');
        });

        it('should fallback to first entry if no .pdf exists in a comma-separated string', () => {
            const result = resolve('specs.docx, boq.xlsx');
            expect(result).toBe('specs.docx');
        });

        it('should resolve a single path string directly (both with and without .pdf)', () => {
            expect(resolve('tender-documents/1788_GeM.pdf')).toBe('tender-documents/1788_GeM.pdf');
            expect(resolve('tender-documents/1788_GeM.docx')).toBe('tender-documents/1788_GeM.docx');
        });
    });

    describe('autoExtractFromPdf', () => {
        it('should propagate NotFoundException when tender does not exist', async () => {
            mockTenderInfosService.validateExists.mockRejectedValue(
                new NotFoundException('Tender with ID 999 not found'),
            );

            await expect(service.autoExtractFromPdf(999, 10)).rejects.toThrow(NotFoundException);
            expect(mockProducer.enqueueExtraction).not.toHaveBeenCalled();
        });

        it('should throw BadRequestException when tender has no uploaded documents', async () => {
            mockTenderInfosService.validateExists.mockResolvedValue({
                id: 101,
                documents: null,
            });

            await expect(service.autoExtractFromPdf(101, 10)).rejects.toThrow(BadRequestException);
            expect(mockProducer.enqueueExtraction).not.toHaveBeenCalled();
        });

        it('should resolve PDF path and enqueue extraction job (happy path)', async () => {
            mockTenderInfosService.validateExists.mockResolvedValue({
                id: 101,
                documents: JSON.stringify(['tenders/101_bid.pdf']),
            });

            mockProducer.enqueueExtraction.mockResolvedValue({
                jobId: 'extract-tender-101',
                status: 'enqueued',
            });

            const response = await service.autoExtractFromPdf(101, 42);

            expect(mockTenderInfosService.validateExists).toHaveBeenCalledWith(101);
            expect(mockProducer.enqueueExtraction).toHaveBeenCalledWith({
                tenderId: 101,
                pdfPath: 'tenders/101_bid.pdf',
                userId: 42,
            });
            expect(response).toEqual({
                jobId: 'extract-tender-101',
                status: 'enqueued',
                message: 'Extraction job enqueued successfully',
            });
        });

        it('should handle deduplicated existing active jobs gracefully', async () => {
            mockTenderInfosService.validateExists.mockResolvedValue({
                id: 101,
                documents: 'tenders/101_bid.pdf',
            });

            mockProducer.enqueueExtraction.mockResolvedValue({
                jobId: 'extract-tender-101',
                status: 'existing_active',
            });

            const response = await service.autoExtractFromPdf(101, 42);

            expect(response).toEqual({
                jobId: 'extract-tender-101',
                status: 'existing_active',
                message: 'Extraction job is already active/processing for this tender',
            });
        });
    });

    describe('getAutoExtractStatus', () => {
        it('should throw NotFoundException if job does not exist in queue', async () => {
            mockProducer.getJobStatus.mockResolvedValue(null);

            await expect(service.getAutoExtractStatus('unknown-job')).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should return processing status when job is active or waiting', async () => {
            mockProducer.getJobStatus.mockResolvedValue({
                jobId: 'extract-tender-101',
                state: 'active',
                progress: 30,
            });

            const result = await service.getAutoExtractStatus('extract-tender-101');
            expect(result).toEqual({
                jobId: 'extract-tender-101',
                status: 'processing',
                state: 'active',
                progress: 30,
            });
        });

        it('should return mapped fields when job is completed', async () => {
            const mockExtractionData = {
                extraction_version: '1.0.0',
                fields: {
                    emdAmount: { value: 100000, confidence: 'high', source: 'regex' },
                    processingFeeAmount: { value: null, confidence: 'not_applicable', source: null },
                },
                missing_fields: ['tenderValue'],
                processing_time_ms: 2150,
            };

            mockProducer.getJobStatus.mockResolvedValue({
                jobId: 'extract-tender-101',
                state: 'completed',
                result: mockExtractionData,
            });

            const result = await service.getAutoExtractStatus('extract-tender-101');
            expect(result).toEqual({
                jobId: 'extract-tender-101',
                status: 'completed',
                fields: mockExtractionData.fields,
                missing_fields: ['tenderValue'],
                extraction_version: '1.0.0',
                processing_time_ms: 2150,
            });
        });

        it('should return failure message when job is failed', async () => {
            mockProducer.getJobStatus.mockResolvedValue({
                jobId: 'extract-tender-101',
                state: 'failed',
                failedReason: 'Connection timed out after 120000ms',
            });

            const result = await service.getAutoExtractStatus('extract-tender-101');
            expect(result).toEqual({
                jobId: 'extract-tender-101',
                status: 'failed',
                error: 'Connection timed out after 120000ms',
            });
        });
    });

    describe('TenderInfoSheetsController Endpoints', () => {
        it('POST /:tenderId/auto-extract should pass tenderId and user.sub to service', async () => {
            const mockUser = { sub: 42, username: 'testuser' };
            const spy = jest.spyOn(service, 'autoExtractFromPdf').mockResolvedValue({
                jobId: 'extract-tender-200',
                status: 'enqueued',
                message: 'Extraction job enqueued successfully',
            });

            const result = await controller.autoExtract(200, mockUser as any);
            expect(spy).toHaveBeenCalledWith(200, 42);
            expect(result.jobId).toBe('extract-tender-200');
        });

        it('GET /auto-extract/:jobId should query service with jobId', async () => {
            const mockUser = { sub: 42, username: 'testuser' };
            const spy = jest.spyOn(service, 'getAutoExtractStatus').mockResolvedValue({
                jobId: 'extract-tender-200',
                status: 'processing',
                state: 'active',
                progress: null,
            });

            const result = await controller.getAutoExtractStatus('extract-tender-200', mockUser as any);
            expect(spy).toHaveBeenCalledWith('extract-tender-200');
            expect(result.status).toBe('processing');
        });
    });
});
