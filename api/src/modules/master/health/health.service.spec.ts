import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { ClaudeUsageService } from './claude-usage.service';
import { DRIZZLE } from '@/db/database.module';

describe('HealthService Database Integrity & Startup Checks (Step 3)', () => {
    let service: HealthService;
    let mockDb: any;
    let mockRedis: any;
    let mockQueue: any;
    let mockClaudeUsageService: any;

    beforeEach(async () => {
        mockDb = {
            execute: jest.fn(),
        };

        mockRedis = {
            status: 'ready',
            ping: jest.fn().mockResolvedValue('PONG'),
            get: jest.fn().mockImplementation(async (key: string) => {
                return JSON.stringify({
                    lastSeen: new Date().toISOString(),
                    pid: 1234,
                    queue: key,
                });
            }),
        };

        mockQueue = {
            getJobCounts: jest.fn().mockResolvedValue({ waiting: 0, active: 0, completed: 5, failed: 0 }),
        };

        mockClaudeUsageService = {
            getCurrentTpm: jest.fn().mockResolvedValue(500),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthService,
                { provide: DRIZZLE, useValue: mockDb },
                { provide: 'REDIS_CONNECTION', useValue: mockRedis },
                { provide: 'FOLLOWUP_QUEUE', useValue: mockQueue },
                { provide: 'CHECKLIST_QUEUE', useValue: mockQueue },
                { provide: 'VIDEO_PROCESSING_QUEUE', useValue: mockQueue },
                { provide: 'GENERIC_QUEUE', useValue: mockQueue },
                { provide: ClaudeUsageService, useValue: mockClaudeUsageService },
            ],
        }).compile();

        service = module.get<HealthService>(HealthService);
    });

    it('should verify required tables successfully when tender_extractions and claude_token_usage exist', async () => {
        mockDb.execute.mockResolvedValueOnce([
            { table_name: 'tender_extractions' },
            { table_name: 'claude_token_usage' },
        ]);

        const loggerLogSpy = jest.spyOn((service as any).logger, 'log').mockImplementation();

        const result = await service.verifyRequiredTablesStartup();

        expect(result.missingTables).toEqual([]);
        expect(result.existingTables).toEqual(
            expect.arrayContaining(['tender_extractions', 'claude_token_usage']),
        );
        expect(loggerLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('[DatabaseIntegrity] Required AI extraction tables verified'),
        );

        loggerLogSpy.mockRestore();
    });

    it('should log a loud CRITICAL DATABASE INTEGRITY ERROR when required tables are missing', async () => {
        // Simulate missing tender_extractions (production incident condition)
        mockDb.execute.mockResolvedValueOnce([
            { table_name: 'claude_token_usage' },
        ]);

        const loggerErrorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation();

        const result = await service.verifyRequiredTablesStartup();

        expect(result.missingTables).toEqual(['tender_extractions']);
        expect(loggerErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('[CRITICAL DATABASE INTEGRITY ERROR] Required table(s) missing from database: [tender_extractions]'),
        );

        loggerErrorSpy.mockRestore();
    });

    it('should automatically invoke verifyRequiredTablesStartup on onApplicationBootstrap', async () => {
        const verifySpy = jest.spyOn(service, 'verifyRequiredTablesStartup').mockResolvedValue({
            missingTables: [],
            existingTables: ['tender_extractions', 'claude_token_usage'],
        });

        await service.onApplicationBootstrap();

        expect(verifySpy).toHaveBeenCalledTimes(1);
        verifySpy.mockRestore();
    });

    it('should report degraded health status in getHealth() when required tables are missing', async () => {
        const loggerErrorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation();

        mockDb.execute.mockImplementation(async () => {
            // By returning [] for tables and { rows: [{}] } for email
            return {
                rows: [{ pending: 0, sending: 0, sent: 0, failed: 0 }],
            };
        });

        const health = await service.getHealth();

        expect(health.status).toBe('degraded');
        const dbData = health.data.database as any;
        expect(dbData.status).toBe('degraded');
        expect(dbData.data.missingTables).toEqual(['tender_extractions', 'claude_token_usage']);
        expect(dbData.data.error).toContain('Required database table(s) missing');

        loggerErrorSpy.mockRestore();
    });
});
