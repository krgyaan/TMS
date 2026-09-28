import { TenderInfoSheetsService } from './info-sheets.service';
import type { DocumentIdentityCheck } from './types/pdf-extraction.types';

jest.mock('uuid', () => ({
    v4: () => 'mock-uuid-v4',
}));

// Tender 3629: Noida main tender with Morena's ATC attached.
const MISMATCH: DocumentIdentityCheck = {
    mainDocumentNumber: 'GEM/2025/B/7017046',
    atcDocumentNumber: 'GEM/2025/B/7021103',
    match: false,
    status: 'mismatch',
    basis: 'gem_bid_number',
    mainNumbersFound: { 'GEM/2025/B/7017046': 3 },
    atcNumbersFound: { 'GEM/2025/B/7021103': 17, 'GEM/2024/B/4774825': 2 },
};

function buildService(db: any, producer: any) {
    const logger = { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const appLogger = { withContext: jest.fn().mockReturnValue(logger) };
    const tenderInfosService = { validateExists: jest.fn().mockResolvedValue({ id: 3629 }) };
    return new TenderInfoSheetsService(
        appLogger as any,
        db,
        {} as any,
        tenderInfosService as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        producer,
    );
}

describe('documentIdentityCheck round trip', () => {
    it('passes the VolksAI identity check through the job-status endpoint unchanged', async () => {
        const producer = {
            enqueueExtraction: jest.fn(),
            getJobStatus: jest.fn().mockResolvedValue({
                jobId: 'extract-tender-3629',
                state: 'completed',
                result: {
                    extraction_version: '1.0.0',
                    fields: {},
                    missing_fields: [],
                    processing_time_ms: 10,
                    documentIdentityCheck: MISMATCH,
                },
            }),
        };
        const service = buildService({} as any, producer);

        const result: any = await service.getAutoExtractStatus('extract-tender-3629');

        expect(result.documentIdentityCheck).toEqual(MISMATCH);
    });

    it('KNOWN GAP: saveExtractionResult does not persist documentIdentityCheck (tender_extractions has no column for it)', async () => {
        // Pins current behavior so the gap is visible: persisting it needs a schema column + migration,
        // which is out of scope here. When that lands, flip this assertion.
        const values = jest.fn().mockReturnValue({ onConflictDoUpdate: jest.fn().mockResolvedValue(undefined) });
        const limit = jest.fn().mockResolvedValue([{ tenderId: 3629, fields: {} }]);
        const db = {
            insert: jest.fn().mockReturnValue({ values }),
            // saveExtractionResult re-reads the row as a follow-up check
            select: jest.fn().mockReturnValue({ from: () => ({ where: () => ({ limit }) }) }),
        };
        const service = buildService(db, { enqueueExtraction: jest.fn(), getJobStatus: jest.fn() });

        await service.saveExtractionResult(
            3629,
            { fields: {}, missing_fields: [], documentIdentityCheck: MISMATCH } as any,
            58,
        );

        expect(values).toHaveBeenCalledTimes(1);
        expect(values.mock.calls[0][0]).not.toHaveProperty('documentIdentityCheck');
    });
});
