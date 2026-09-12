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
            log: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
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

    describe('resolveTenderDocuments & resolveTenderPdfPath', () => {
        const resolve = (docs: unknown) => service.resolveTenderPdfPath(docs);
        const resolveStructured = (docs: unknown) => service.resolveTenderDocuments(docs);

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

        it('should parse structured JSON shape (v1) with all slots', () => {
            const structuredDoc = JSON.stringify({
                schemaVersion: 1,
                mainTender: 'tender-documents/nit-main.pdf',
                atc: ['tender-documents/atc-1.pdf', 'tender-documents/atc-2.pdf'],
                boq: 'tender-documents/boq-schedule.pdf',
                otherDocuments: ['tender-documents/company-profile.pdf', 'tender-documents/drawing.png'],
            });

            const result = resolveStructured(structuredDoc);
            expect(result.schemaVersion).toBe(1);
            expect(result.mainTenderPath).toBe('tender-documents/nit-main.pdf');
            expect(result.atcPaths).toEqual(['tender-documents/atc-1.pdf', 'tender-documents/atc-2.pdf']);
            expect(result.boqPath).toBe('tender-documents/boq-schedule.pdf');
            expect(result.otherDocumentsPaths).toEqual(['tender-documents/company-profile.pdf', 'tender-documents/drawing.png']);

            expect(resolve(structuredDoc)).toBe('tender-documents/nit-main.pdf');
        });

        it('should parse legacy flat array treating paths[0] as mainTender and rest as otherDocuments', () => {
            const legacyArray = ['tender-documents/notice.pdf', 'specs.docx', 'boq.xlsx'];
            const result = resolveStructured(legacyArray);

            expect(result.schemaVersion).toBe(1);
            expect(result.mainTenderPath).toBe('tender-documents/notice.pdf');
            expect(result.atcPaths).toEqual([]);
            expect(result.boqPath).toBeNull();
            expect(result.otherDocumentsPaths).toEqual(['specs.docx', 'boq.xlsx']);

            expect(resolve(legacyArray)).toBe('tender-documents/notice.pdf');
        });

        it('should parse JSON-stringified legacy flat array treating paths[0] as mainTender and rest as otherDocuments', () => {
            const jsonStr = JSON.stringify(['tender-documents/notice.pdf', 'specs.docx', 'boq.xlsx']);
            const result = resolveStructured(jsonStr);

            expect(result.schemaVersion).toBe(1);
            expect(result.mainTenderPath).toBe('tender-documents/notice.pdf');
            expect(result.atcPaths).toEqual([]);
            expect(result.boqPath).toBeNull();
            expect(result.otherDocumentsPaths).toEqual(['specs.docx', 'boq.xlsx']);

            expect(resolve(jsonStr)).toBe('tender-documents/notice.pdf');
        });

        it('should parse legacy comma-separated string treating paths[0] as mainTender and rest as otherDocuments', () => {
            const result = resolveStructured('tender-documents/notice.pdf, specs.docx, boq.xlsx');
            expect(result.mainTenderPath).toBe('tender-documents/notice.pdf');
            expect(result.otherDocumentsPaths).toEqual(['specs.docx', 'boq.xlsx']);
            expect(resolve('tender-documents/notice.pdf, specs.docx, boq.xlsx')).toBe('tender-documents/notice.pdf');
        });

        it('should resolve a single path string directly', () => {
            const result = resolveStructured('tender-documents/1788_GeM.pdf');
            expect(result.mainTenderPath).toBe('tender-documents/1788_GeM.pdf');
            expect(result.otherDocumentsPaths).toEqual([]);
            expect(resolve('tender-documents/1788_GeM.pdf')).toBe('tender-documents/1788_GeM.pdf');
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

        it('should resolve PDF path and enqueue extraction job (happy path with legacy flat array)', async () => {
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
                mainTenderPath: 'tenders/101_bid.pdf',
                atcPaths: [],
                boqPath: null,
                userId: 42,
            });
            expect(response).toEqual({
                jobId: 'extract-tender-101',
                status: 'enqueued',
                message: 'Extraction job enqueued successfully',
            });
        });

        it('should build VolksAI payload with mainTenderPath, atcPaths, boqPath from structured JSON', async () => {
            const structuredDoc = JSON.stringify({
                schemaVersion: 1,
                mainTender: 'tenders/101_nit.pdf',
                atc: ['tenders/101_atc1.pdf', 'tenders/101_atc2.pdf'],
                boq: 'tenders/101_boq.pdf',
                otherDocuments: ['tenders/101_confidential_specs.pdf', 'tenders/101_drawing.dwg'],
            });

            mockTenderInfosService.validateExists.mockResolvedValue({
                id: 101,
                documents: structuredDoc,
            });

            mockProducer.enqueueExtraction.mockResolvedValue({
                jobId: 'extract-tender-101',
                status: 'enqueued',
            });

            const response = await service.autoExtractFromPdf(101, 42);

            expect(mockProducer.enqueueExtraction).toHaveBeenCalledWith({
                tenderId: 101,
                pdfPath: 'tenders/101_nit.pdf',
                mainTenderPath: 'tenders/101_nit.pdf',
                atcPaths: ['tenders/101_atc1.pdf', 'tenders/101_atc2.pdf'],
                boqPath: 'tenders/101_boq.pdf',
                userId: 42,
            });

            expect(response).toEqual({
                jobId: 'extract-tender-101',
                status: 'enqueued',
                message: 'Extraction job enqueued successfully',
            });
        });

        it('SECURITY BOUNDARY GUARD: otherDocuments must NEVER appear in the payload dispatched to VolksAI', async () => {
            const structuredDoc = JSON.stringify({
                schemaVersion: 1,
                mainTender: 'tenders/sec_nit.pdf',
                atc: ['tenders/sec_atc.pdf'],
                boq: 'tenders/sec_boq.pdf',
                otherDocuments: [
                    'tenders/confidential_financial_pnl.xlsx',
                    'tenders/proprietary_schematic.pdf',
                    'tenders/internal_memo.docx',
                ],
            });

            mockTenderInfosService.validateExists.mockResolvedValue({
                id: 202,
                documents: structuredDoc,
            });

            mockProducer.enqueueExtraction.mockResolvedValue({
                jobId: 'extract-tender-202',
                status: 'enqueued',
            });

            await service.autoExtractFromPdf(202, 99);

            expect(mockProducer.enqueueExtraction).toHaveBeenCalledTimes(1);
            const dispatchedPayload = mockProducer.enqueueExtraction.mock.calls[0][0];

            // Explicit security boundary assertions
            expect(dispatchedPayload).not.toHaveProperty('otherDocuments');
            expect(dispatchedPayload).not.toHaveProperty('otherDocumentsPaths');
            expect(dispatchedPayload).not.toHaveProperty('other_documents');

            // Assert none of the sensitive file names appear anywhere in the serialized payload
            const serializedPayload = JSON.stringify(dispatchedPayload);
            expect(serializedPayload).not.toContain('confidential_financial_pnl.xlsx');
            expect(serializedPayload).not.toContain('proprietary_schematic.pdf');
            expect(serializedPayload).not.toContain('internal_memo.docx');

            // Assert allowed payload keys only
            expect(dispatchedPayload).toEqual({
                tenderId: 202,
                pdfPath: 'tenders/sec_nit.pdf',
                mainTenderPath: 'tenders/sec_nit.pdf',
                atcPaths: ['tenders/sec_atc.pdf'],
                boqPath: 'tenders/sec_boq.pdf',
                userId: 99,
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
