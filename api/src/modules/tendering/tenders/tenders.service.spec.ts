jest.mock('uuid', () => ({
    v4: () => 'mock-uuid-v4',
    v7: () => 'mock-uuid-v7',
}));

import { TenderInfosService } from './tenders.service';
import { tenderInfos, tenderExtractions, biddingRequirementsJobs } from '@/db/schemas';

describe('TenderInfosService document invalidation (Prompt 2A b)', () => {
    let service: TenderInfosService;
    let mockDb: any;
    let mockLogger: any;
    let mockAppLogger: any;
    let mockTenderStatusHistoryService: any;
    let mockEmailService: any;
    let mockRecipientResolver: any;
    let mockTimersService: any;
    let mockConfigService: any;
    let mockFileUploadService: any;
    let mockTenderNotificationService: any;

    beforeEach(() => {
        mockLogger = {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            withContext: jest.fn().mockReturnThis(),
        };
        mockAppLogger = {
            withContext: jest.fn().mockReturnValue(mockLogger),
        };
        mockTenderStatusHistoryService = {};
        mockEmailService = {
            sendMail: jest.fn(),
        };
        mockRecipientResolver = {};
        mockTimersService = {
            startTimer: jest.fn(),
        };
        mockConfigService = {
            get: jest.fn(),
        };
        mockFileUploadService = {};
        mockTenderNotificationService = {
            notifyTenderAllocated: jest.fn().mockResolvedValue(undefined),
        };

        mockDb = {
            select: jest.fn(),
            update: jest.fn(),
        };

        service = new (TenderInfosService as any)(
            mockAppLogger as any,
            mockDb as any,
            mockTenderStatusHistoryService as any,
            mockEmailService as any,
            mockRecipientResolver as any,
            mockTimersService as any,
            mockConfigService as any,
            mockFileUploadService as any,
            mockTenderNotificationService as any,
        );
    });

    it('should mark tender_extractions and bidding_requirements_jobs stale when documents change, without deleting user-edited values', async () => {
        const tenderId = 123;
        const currentTender: any = {
            id: tenderId,
            tenderNo: 'TND-123',
            documents: 'doc_v1.pdf',
            remarks: 'old remarks',
        };

        const updatedRow: any = {
            ...currentTender,
            documents: 'doc_v2.pdf',
        };

        // Mock findById for before and after update
        jest.spyOn(service, 'findById').mockResolvedValue(currentTender);
        // Mock sendTenderUpdateEmail to avoid side effects
        jest.spyOn(service as any, 'sendTenderUpdateEmail').mockResolvedValue(undefined);

        const updateCalls: Array<{ table: any; setArgs: any }> = [];

        mockDb.update.mockImplementation((table: any) => {
            return {
                set: jest.fn().mockImplementation((setArgs: any) => {
                    updateCalls.push({ table, setArgs });
                    return {
                        where: jest.fn().mockImplementation(() => {
                            return {
                                returning: jest.fn().mockResolvedValue([updatedRow]),
                            };
                        }),
                    };
                }),
            };
        });

        const result = await service.update(tenderId, { documents: 'doc_v2.pdf' }, 42);

        expect(result).toBeDefined();

        // 1. Verify tenderInfos was updated
        const tenderInfosUpdate = updateCalls.find((c) => c.table === tenderInfos);
        expect(tenderInfosUpdate).toBeDefined();
        expect(tenderInfosUpdate?.setArgs.documents).toBe('doc_v2.pdf');

        // 2. Verify tender_extractions was marked stale (extractionVersion: 'stale'), and NO fields were deleted
        const extractionsUpdate = updateCalls.find((c) => c.table === tenderExtractions);
        expect(extractionsUpdate).toBeDefined();
        expect(extractionsUpdate?.setArgs).toMatchObject({
            extractionVersion: 'stale',
        });
        // Never delete fields
        expect(extractionsUpdate?.setArgs).not.toHaveProperty('fields');
        expect(extractionsUpdate?.setArgs).not.toHaveProperty('missingFields');

        // 3. Verify bidding_requirements_jobs was marked stale (status: 'stale')
        const biddingJobsUpdate = updateCalls.find((c) => c.table === biddingRequirementsJobs);
        expect(biddingJobsUpdate).toBeDefined();
        expect(biddingJobsUpdate?.setArgs).toMatchObject({
            status: 'stale',
        });
        expect(biddingJobsUpdate?.setArgs).not.toHaveProperty('result');
    });

    it('should NOT mark extractions or bidding jobs stale when documents are unchanged', async () => {
        const tenderId = 123;
        const currentTender: any = {
            id: tenderId,
            tenderNo: 'TND-123',
            documents: 'doc_v1.pdf',
            remarks: 'old remarks',
        };

        const updatedRow: any = {
            ...currentTender,
            remarks: 'new remarks',
        };

        jest.spyOn(service, 'findById').mockResolvedValue(currentTender);
        jest.spyOn(service as any, 'sendTenderUpdateEmail').mockResolvedValue(undefined);

        const updateCalls: Array<{ table: any; setArgs: any }> = [];

        mockDb.update.mockImplementation((table: any) => {
            return {
                set: jest.fn().mockImplementation((setArgs: any) => {
                    updateCalls.push({ table, setArgs });
                    return {
                        where: jest.fn().mockImplementation(() => {
                            return {
                                returning: jest.fn().mockResolvedValue([updatedRow]),
                            };
                        }),
                    };
                }),
            };
        });

        // Update remarks only, documents undefined
        await service.update(tenderId, { remarks: 'new remarks' }, 42);

        expect(updateCalls.some((c) => c.table === tenderExtractions)).toBe(false);
        expect(updateCalls.some((c) => c.table === biddingRequirementsJobs)).toBe(false);

        // Update with identical documents string
        updateCalls.length = 0;
        await service.update(tenderId, { documents: 'doc_v1.pdf' }, 42);

        expect(updateCalls.some((c) => c.table === tenderExtractions)).toBe(false);
        expect(updateCalls.some((c) => c.table === biddingRequirementsJobs)).toBe(false);
    });

    it('should preserve all user-edited fields and info-sheet values when marking extraction stale', async () => {
        const tenderId = 456;
        const currentTenderWithEdits: any = {
            id: tenderId,
            tenderNo: 'TND-456-USER-EDITED',
            documents: 'initial_doc.pdf',
            tenderValue: 12500000,
            remarks: 'User custom notes on tender',
            status: 'IN_REVIEW',
        };

        const updatedRow: any = {
            ...currentTenderWithEdits,
            documents: 'new_addendum_doc.pdf',
        };

        jest.spyOn(service, 'findById').mockResolvedValue(currentTenderWithEdits);
        jest.spyOn(service as any, 'sendTenderUpdateEmail').mockResolvedValue(undefined);

        const updateCalls: Array<{ table: any; setArgs: any }> = [];

        mockDb.update.mockImplementation((table: any) => {
            return {
                set: jest.fn().mockImplementation((setArgs: any) => {
                    updateCalls.push({ table, setArgs });
                    return {
                        where: jest.fn().mockImplementation(() => {
                            return {
                                returning: jest.fn().mockResolvedValue([updatedRow]),
                            };
                        }),
                    };
                }),
            };
        });

        // Trigger document change
        await service.update(tenderId, { documents: 'new_addendum_doc.pdf' }, 10);

        // 1. Verify the extraction update touched ONLY extractionVersion and updatedAt
        const extractionsUpdate = updateCalls.find((c) => c.table === tenderExtractions);
        expect(extractionsUpdate).toBeDefined();
        expect(extractionsUpdate?.setArgs).toHaveProperty('extractionVersion', 'stale');
        expect(extractionsUpdate?.setArgs).toHaveProperty('updatedAt');

        // Crucial: ensure no user-edited fields or missingFields were wiped/overwritten
        const extractionKeys = Object.keys(extractionsUpdate?.setArgs || {});
        expect(extractionKeys.sort()).toEqual(['extractionVersion', 'updatedAt'].sort());
        expect(extractionsUpdate?.setArgs).not.toHaveProperty('fields');
        expect(extractionsUpdate?.setArgs).not.toHaveProperty('missingFields');

        // 2. Verify bidding requirements update touched ONLY status and updatedAt
        const biddingJobsUpdate = updateCalls.find((c) => c.table === biddingRequirementsJobs);
        expect(biddingJobsUpdate).toBeDefined();
        const biddingKeys = Object.keys(biddingJobsUpdate?.setArgs || {});
        expect(biddingKeys.sort()).toEqual(['status', 'updatedAt'].sort());
        expect(biddingJobsUpdate?.setArgs).not.toHaveProperty('result');

        // 3. User tender fields on tenderInfos update preserved
        const tenderInfosUpdate = updateCalls.find((c) => c.table === tenderInfos);
        expect(tenderInfosUpdate).toBeDefined();
        expect(tenderInfosUpdate?.setArgs.documents).toBe('new_addendum_doc.pdf');
    });
});
