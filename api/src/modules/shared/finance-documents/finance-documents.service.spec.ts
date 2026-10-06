import { Test, TestingModule } from '@nestjs/testing';
import { FinanceDocumentsService } from './finance-documents.service';
import { DRIZZLE } from '@db/database.module';

describe('FinanceDocumentsService', () => {
    let service: FinanceDocumentsService;
    let mockDb: any;

    beforeEach(async () => {
        const queryChain: any = {
            from: jest.fn().mockReturnThis(),
            leftJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            offset: jest.fn().mockResolvedValue([
                {
                    id: 1,
                    documentName: 'Company MOA',
                    documentType: 2,
                    financialYear: 3,
                    documentPath: ['uploads/moa.pdf'],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]),
            then: jest.fn().mockImplementation((cb) => Promise.resolve(cb([{ count: 1 }]))),
        };

        mockDb = {
            select: jest.fn().mockReturnValue(queryChain),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FinanceDocumentsService,
                { provide: DRIZZLE, useValue: mockDb },
            ],
        }).compile();

        service = module.get<FinanceDocumentsService>(FinanceDocumentsService);
    });

    it('should query with left joins on financeDocTypes and financialYears when search is provided', async () => {
        const result = await service.findAll({ search: 'moa' });

        expect(mockDb.select).toHaveBeenCalledTimes(2); // count query and data query
        expect(result.data).toHaveLength(1);
        expect(result.data[0].documentName).toBe('Company MOA');
        expect(result.meta.total).toBe(1);
    });

    it('should support sorting by documentType and financialYear', async () => {
        await service.findAll({ sortBy: 'documentType', sortOrder: 'asc' });
        expect(mockDb.select).toHaveBeenCalled();

        await service.findAll({ sortBy: 'financialYear', sortOrder: 'desc' });
        expect(mockDb.select).toHaveBeenCalled();
    });
});
