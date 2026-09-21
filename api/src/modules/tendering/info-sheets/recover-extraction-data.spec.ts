import { runRecovery } from '../../../../scripts/recover-extraction-data';
import * as fs from 'fs';
import * as path from 'path';

describe('recover-extraction-data (Step 4)', () => {
    const tempLogFile = path.join(__dirname, 'temp_test_recovery.log');
    let mockDb: any;

    const sampleLogLines = [
        `2026-09-21T06:30:00.000Z error: [EXTRACTION_FALLBACK_RECOVERY] Failed to persist extraction to database: {"tag":"EXTRACTION_FALLBACK_RECOVERY","tenderId":3665,"jobId":"extract-tender-3665","userId":1,"failureTimestamp":"2026-09-21T06:30:00.000Z","error":"relation \\"tender_extractions\\" does not exist","rawExtraction":{"fields":{"emdAmount":{"value":100000,"confidence":"high"}},"missing_fields":["processingFee"],"extraction_version":"1.0.0","processing_time_ms":1500}}`,
        `2026-09-21T06:30:00.000Z error: [CLAUDE_USAGE_FALLBACK_RECOVERY] Failed to insert claude_token_usage: {"tag":"CLAUDE_USAGE_FALLBACK_RECOVERY","tenderId":3665,"jobId":"extract-tender-3665","userId":1,"failureTimestamp":"2026-09-21T06:30:00.000Z","error":"relation \\"claude_token_usage\\" does not exist","records":[{"tenderId":3665,"userId":1,"jobId":"extract-tender-3665","callType":"main_extraction","model":"claude-haiku-4-5-20251001","inputTokens":12000,"outputTokens":800,"cacheCreationTokens":0,"cacheReadTokens":0,"totalTokens":12800,"estimatedCostUsd":"0.015000","durationMs":1500}]}`,
        `2026-09-21T06:35:00.000Z error: [EXTRACTION_FALLBACK_RECOVERY] Failed to persist extraction to database: {"tag":"EXTRACTION_FALLBACK_RECOVERY","tenderId":1234,"jobId":"extract-tender-1234","userId":2,"failureTimestamp":"2026-09-21T06:35:00.000Z","error":"relation \\"tender_extractions\\" does not exist","rawExtraction":{"fields":{"turnover":{"value":5000000}},"missing_fields":[],"extraction_version":"1.0.0","processing_time_ms":1100}}`,
    ].join('\n');

    beforeAll(() => {
        fs.writeFileSync(tempLogFile, sampleLogLines, 'utf-8');
    });

    afterAll(() => {
        if (fs.existsSync(tempLogFile)) {
            fs.unlinkSync(tempLogFile);
        }
    });

    beforeEach(() => {
        mockDb = {
            execute: jest.fn().mockResolvedValue([
                { table_name: 'tender_extractions' },
                { table_name: 'claude_token_usage' },
            ]),
            insert: jest.fn().mockReturnValue({
                values: jest.fn().mockReturnValue({
                    onConflictDoUpdate: jest.fn().mockResolvedValue({ rowCount: 1 }),
                }),
            }),
        };
    });

    it('should parse log file in dry-run mode by default without executing db writes', async () => {
        const result = await runRecovery({
            filePath: tempLogFile,
            isDryRun: true,
            dbOverride: mockDb,
        });

        expect(result.extractionRecovered).toBe(2);
        expect(result.usageRecovered).toBe(1);
        expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should filter by specific tenderId (e.g. 3665)', async () => {
        const result = await runRecovery({
            filePath: tempLogFile,
            targetTenderId: 3665,
            isDryRun: true,
            dbOverride: mockDb,
        });

        expect(result.extractionRecovered).toBe(1);
        expect(result.usageRecovered).toBe(1);
        expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should throw clear error on apply when target tables do not exist in database', async () => {
        // Return no existing tables
        mockDb.execute.mockResolvedValueOnce([]);

        await expect(
            runRecovery({
                filePath: tempLogFile,
                targetTenderId: 3665,
                isDryRun: false,
                dbOverride: mockDb,
            }),
        ).rejects.toThrow(/Target table 'tender_extractions' does not exist in database/);

        expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should execute upsert into tender_extractions and insert into claude_token_usage on --apply when tables exist', async () => {
        const result = await runRecovery({
            filePath: tempLogFile,
            targetTenderId: 3665,
            isDryRun: false,
            dbOverride: mockDb,
        });

        expect(result.extractionRecovered).toBe(1);
        expect(result.usageRecovered).toBe(1);
        expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });
});
