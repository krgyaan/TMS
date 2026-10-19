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

describe('TenderApprovalService - EMD sync on TL approval', () => {
    const basePayload: any = {
        tlStatus: '1', // Approved
        rfqTo: [],
        rfqRequired: 'NO',
        tlApprovalRemarks: 'Approved by TL',
    };

    it('does NOT overwrite emd when infoSheet.emdAmount is 0', async () => {
        const { service } = buildService({
            tenderValue: 500000,
            tenderFeeAmount: 1000,
            emdAmount: 0,
        });

        const result: any = await (service as any).buildApprovalUpdateData(1001, basePayload, false);

        expect(result.updateData.emd).toBeUndefined();
        expect(result.updateData.gstValues).toBe('500000');
        expect(result.updateData.tenderFees).toBe('1000');
    });

    it('does NOT overwrite emd when infoSheet.emdAmount is "0" or "0.00"', async () => {
        for (const zeroVal of ['0', '0.00', 0.0]) {
            const { service } = buildService({
                tenderValue: 500000,
                tenderFeeAmount: 1000,
                emdAmount: zeroVal,
            });

            const result: any = await (service as any).buildApprovalUpdateData(1001, basePayload, false);
            expect(result.updateData.emd).toBeUndefined();
        }
    });

    it('does NOT overwrite emd when infoSheet.emdAmount is null or undefined', async () => {
        const { service } = buildService({
            tenderValue: 500000,
            tenderFeeAmount: null,
            emdAmount: null,
        });

        const result: any = await (service as any).buildApprovalUpdateData(1001, basePayload, false);
        expect(result.updateData.emd).toBeUndefined();
    });

    it('syncs emd when infoSheet.emdAmount is a positive number', async () => {
        const { service } = buildService({
            tenderValue: 500000,
            tenderFeeAmount: 1000,
            emdAmount: 50000,
        });

        const result: any = await (service as any).buildApprovalUpdateData(1001, basePayload, false);
        expect(result.updateData.emd).toBe('50000');
    });

    it('does NOT overwrite gstValues when infoSheet.tenderValue is 0, "0", null, or undefined', async () => {
        for (const zeroVal of [0, '0', '0.00', null, undefined]) {
            const { service } = buildService({
                tenderValue: zeroVal,
                tenderFeeAmount: 500,
                emdAmount: 25000,
            });

            const result: any = await (service as any).buildApprovalUpdateData(1001, basePayload, false);
            expect(result.updateData.gstValues).toBeUndefined();
            expect(result.updateData.tenderFees).toBe('500');
            expect(result.updateData.emd).toBe('25000');
        }
    });

    it('syncs gstValues when infoSheet.tenderValue is a positive number', async () => {
        const { service } = buildService({
            tenderValue: 1250000,
            tenderFeeAmount: 500,
            emdAmount: 25000,
        });

        const result: any = await (service as any).buildApprovalUpdateData(1001, basePayload, false);
        expect(result.updateData.gstValues).toBe('1250000');
    });

    it('preserves tenderFees sync even when tenderFeeAmount is 0 (as 0 fees is legitimate)', async () => {
        const { service } = buildService({
            tenderValue: 100000,
            tenderFeeAmount: 0,
            emdAmount: 5000,
        });

        const result: any = await (service as any).buildApprovalUpdateData(1001, basePayload, false);
        expect(result.updateData.tenderFees).toBe('0');
    });
});
