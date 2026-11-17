jest.mock('uuid', () => ({
    v4: () => 'mock-uuid-v4',
}));

import { TenderApprovalService } from './tender-approval.service';

function buildService(infoSheetMock: any) {
    const logger = { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const appLogger = { withContext: jest.fn().mockReturnValue(logger) };
    const db = {
        delete: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue({}),
        }),
    };
    const tenderInfoSheetsService = {
        findByTenderId: jest.fn().mockResolvedValue(infoSheetMock),
    };

    const service = new TenderApprovalService(
        appLogger as any,
        db as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        tenderInfoSheetsService as any,
        {} as any,
    );

    return { service, tenderInfoSheetsService };
}

describe('TenderApprovalService - incomplete status', () => {
    it('sets tender status to 29 when marking incomplete for the first time', async () => {
        const { service } = buildService(null);

        const result: any = await (service as any).buildApprovalUpdateData(1001, { tlStatus: '3' });

        expect(result.updateData.status).toBe(29);
        expect(result.newStatus).toBe(29);
    });

    it('sets tender status to 29 when re-marking incomplete in edit mode', async () => {
        const { service } = buildService(null);

        const result: any = await (service as any).buildApprovalUpdateData(1001, { tlStatus: '3' });

        expect(result.updateData.status).toBe(29);
        expect(result.newStatus).toBe(29);
    });
});

describe('TenderApprovalService - TL approval', () => {
    const basePayload: any = {
        tlStatus: '1',
        rfqTo: [],
        rfqRequired: 'NO',
        tlApprovalRemarks: 'Approved by TL',
    };

    it('sets tender status to 3 (Tender Info approved)', async () => {
        const { service } = buildService({
            tenderValue: 500000,
            tenderFeeAmount: 1000,
            emdAmount: 50000,
        });

        const result: any = await (service as any).buildApprovalUpdateData(1001, basePayload);

        expect(result.updateData.status).toBe(3);
        expect(result.newStatus).toBe(3);
        expect(result.statusComment).toBe('Tender info approved');
    });

    it('syncs gstValues, tenderFees and emd from the info sheet', async () => {
        const { service } = buildService({
            tenderValue: 1250000,
            tenderFeeAmount: 500,
            emdAmount: 25000,
        });

        const result: any = await (service as any).buildApprovalUpdateData(1001, basePayload);

        expect(result.updateData.gstValues).toBe('1250000');
        expect(result.updateData.tenderFees).toBe('500');
        expect(result.updateData.emd).toBe('25000');
    });

    it('writes "0" for gstValues, tenderFees and emd when info sheet values are zero', async () => {
        const { service } = buildService({
            tenderValue: 0,
            tenderFeeAmount: 0,
            emdAmount: 0,
        });

        const result: any = await (service as any).buildApprovalUpdateData(1001, basePayload);

        expect(result.updateData.gstValues).toBe('0');
        expect(result.updateData.tenderFees).toBe('0');
        expect(result.updateData.emd).toBe('0');
    });

    it('writes "0" for gstValues, tenderFees and emd when info sheet values are null or undefined', async () => {
        for (const emptyValue of [null, undefined]) {
            const { service } = buildService({
                tenderValue: emptyValue,
                tenderFeeAmount: emptyValue,
                emdAmount: emptyValue,
            });

            const result: any = await (service as any).buildApprovalUpdateData(1001, basePayload);

            expect(result.updateData.gstValues).toBe('0');
            expect(result.updateData.tenderFees).toBe('0');
            expect(result.updateData.emd).toBe('0');
        }
    });

    it('forces emd to "0" when EMD mode is exempt', async () => {
        const { service } = buildService({
            tenderValue: 500000,
            tenderFeeAmount: 1000,
            emdAmount: 50000,
        });

        const result: any = await (service as any).buildApprovalUpdateData(1001, {
            ...basePayload,
            emdMode: 'exempt',
        });

        expect(result.updateData.emd).toBe('0');
    });
});

describe('TenderApprovalService - rejection', () => {
    it('updates tender status on first rejection', async () => {
        const { service } = buildService(null);

        const result: any = await (service as any).buildApprovalUpdateData(1001, {
            tlStatus: '2',
            tenderStatus: 10,
        });

        expect(result.updateData.status).toBe(10);
        expect(result.newStatus).toBe(10);
        expect(result.statusComment).toBe('Tender rejected');
    });

    it('updates tender status when editing an existing rejection', async () => {
        const { service } = buildService(null);

        const result: any = await (service as any).buildApprovalUpdateData(1001, {
            tlStatus: '2',
            tenderStatus: 12,
        });

        expect(result.updateData.status).toBe(12);
        expect(result.newStatus).toBe(12);
    });
});
