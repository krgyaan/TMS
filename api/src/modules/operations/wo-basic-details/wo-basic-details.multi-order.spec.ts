import { woBasicDetails } from '@db/schemas/operations';
import { WoBasicDetailsService } from './wo-basic-details.service';

describe('WoBasicDetailsService multi-order support', () => {
    let service: WoBasicDetailsService;
    let mockDb: any;
    let mockLogger: any;
    let mockAppLogger: any;
    let mockTenderStatusHistoryService: any;
    let mockPaymentRequestService: any;
    let mockCashFlowService: any;
    let mockOperationNotifications: any;

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
        mockTenderStatusHistoryService = {
            trackStatusChange: jest.fn().mockResolvedValue(undefined),
        };
        mockPaymentRequestService = {};
        mockCashFlowService = {};
        mockOperationNotifications = {};
        mockDb = {
            select: jest.fn(),
            update: jest.fn(),
            insert: jest.fn(),
            transaction: jest.fn(),
        };

        service = new WoBasicDetailsService(
            mockAppLogger as any,
            mockDb as any,
            mockTenderStatusHistoryService as any,
            mockPaymentRequestService as any,
            mockCashFlowService as any,
            mockOperationNotifications as any,
        );
    });

    it('creates a repeat order with max+1 sequence', async () => {
        const createdRow = {
            id: 99,
            tenderId: 10,
            orderType: 'repeat',
            orderSequence: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Tender lookup used by create()
        mockDb.select.mockImplementationOnce(() => ({
            from: () => ({
                where: () => ({
                    limit: () => Promise.resolve([{ teamId: 1, status: 25, organizationId: 2 }]),
                }),
            }),
        }));

        const txSelect = jest.fn()
            .mockImplementationOnce(() => ({
                from: () => ({ where: () => Promise.resolve([{ existingOrders: 1 }]) }),
            }))
            .mockImplementationOnce(() => ({
                from: () => ({
                    where: () => ({
                        orderBy: () => ({
                            limit: () => Promise.resolve([{ status: 'Won' }]),
                        }),
                    }),
                }),
            }))
            .mockImplementationOnce(() => ({
                from: () => ({ where: () => Promise.resolve([{ maxSequence: 2 }]) }),
            }));
        const tx = {
            select: txSelect,
            insert: jest.fn(() => ({
                values: (values: any) => {
                    expect(values.orderType).toBe('repeat');
                    expect(values.orderSequence).toBe(3);
                    return { returning: () => Promise.resolve([createdRow]) };
                },
            })),
        };

        mockDb.transaction.mockImplementation(async (callback: (tx: any) => unknown) => callback(tx));
        mockDb.update.mockImplementation(() => ({
            set: () => ({ where: () => Promise.resolve(undefined) }),
        }));

        jest.spyOn(service, 'checkProjectCodeExists').mockResolvedValue({ exists: false, projectCode: 'P-1' } as any);
        jest.spyOn(service, 'checkProjectNameExists').mockResolvedValue({
            exists: false,
            count: 0,
            projectName: 'Project',
            existingProjectNames: [],
            suggestion: null,
        } as any);
        jest.spyOn(service as any, 'notifyWoBasicDetailsWhatsapp').mockImplementation(() => undefined);
        jest.spyOn(service as any, 'safeCreateProject').mockImplementation(() => undefined);

        const result = await service.create({
            tenderId: 10,
            orderType: 'repeat',
            projectCode: 'P-1',
            projectName: 'Project',
            woNumber: 'WO-1',
            woDate: '2026-01-01',
            woValuePreGst: '100',
            woValueGstAmt: '18',
        }, 7);

        expect(result?.id).toBe(99);
        expect(txSelect).toHaveBeenCalledTimes(3);
        expect(txSelect).toHaveBeenCalledWith(
            expect.objectContaining({
                maxSequence: expect.anything(),
            }),
        );
        expect(tx.insert).toHaveBeenCalledWith(woBasicDetails);
        expect(mockTenderStatusHistoryService.trackStatusChange).toHaveBeenCalledWith(
            10,
            26,
            7,
            25,
            'WO Basic Details created',
        );
    });

    it('rejects adding another order when the tender is not won', async () => {
        mockDb.select.mockImplementationOnce(() => ({
            from: () => ({
                where: () => ({
                    limit: () => Promise.resolve([{ teamId: 1, status: 25, organizationId: 2 }]),
                }),
            }),
        }));

        const txSelect = jest.fn()
            .mockImplementationOnce(() => ({
                from: () => ({ where: () => Promise.resolve([{ existingOrders: 1 }]) }),
            }))
            .mockImplementationOnce(() => ({
                from: () => ({
                    where: () => ({
                        orderBy: () => ({
                            limit: () => Promise.resolve([{ status: 'Lost' }]),
                        }),
                    }),
                }),
            }));
        const tx = {
            select: txSelect,
            insert: jest.fn(),
            update: jest.fn(),
        };
        mockDb.transaction.mockImplementation(async (callback: (tx: any) => unknown) => callback(tx));

        jest.spyOn(service, 'checkProjectCodeExists').mockResolvedValue({ exists: false, projectCode: 'P-1' } as any);
        jest.spyOn(service, 'checkProjectNameExists').mockResolvedValue({
            exists: false,
            count: 0,
            projectName: 'Project',
            existingProjectNames: [],
            suggestion: null,
        } as any);

        await expect(service.create({
            tenderId: 10,
            orderType: 'single',
            projectCode: 'P-1',
            projectName: 'Project',
            woNumber: 'WO-1',
            woDate: '2026-01-01',
            woValuePreGst: '100',
            woValueGstAmt: '18',
        }, 7)).rejects.toThrow('A new order can only be added to a won tender.');

        expect(tx.insert).not.toHaveBeenCalled();
    });

    it('returns orders ordered by sequence then id', async () => {
        const rows = [
            { id: 2, orderType: 'multiple', orderSequence: 1 },
            { id: 1, orderType: 'multiple', orderSequence: 1 },
        ];
        const orderBy = jest.fn().mockResolvedValue(rows);
        mockDb.select.mockReturnValue({
            from: () => ({
                where: () => ({ orderBy }),
            }),
        });

        const result = await service.findByTenderId(10);

        expect(orderBy).toHaveBeenCalledTimes(1);
        expect(result.map((row) => row.id)).toEqual([2, 1]);
    });
});
