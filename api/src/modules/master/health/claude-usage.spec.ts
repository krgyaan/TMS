import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { ClaudeUsageService } from './claude-usage.service';
import { AdminUsageService } from './admin-usage.service';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { RoleName } from '@/common/constants/roles.constant';
import { ROLES_KEY } from '@/modules/auth/decorators/roles.decorator';
import { DRIZZLE } from '@/db/database.module';

describe('ClaudeUsageService & Health Controller RBAC Security', () => {
    let controller: HealthController;
    let claudeUsageService: ClaudeUsageService;
    let adminUsageService: AdminUsageService;
    let mockRedis: any;
    let mockDb: any;
    let reflector: Reflector;
    let rolesGuard: RolesGuard;

    beforeEach(async () => {
        mockRedis = {
            pipeline: jest.fn().mockReturnValue({
                zadd: jest.fn().mockReturnThis(),
                zremrangebyscore: jest.fn().mockReturnThis(),
                expire: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([null, null, null]),
            }),
            zremrangebyscore: jest.fn().mockResolvedValue(0),
            zrangebyscore: jest.fn().mockResolvedValue([]),
        };

        mockDb = {
            execute: jest.fn().mockResolvedValue({ rows: [] }),
            insert: jest.fn().mockReturnValue({
                values: jest.fn().mockResolvedValue({}),
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                Reflector,
                RolesGuard,
                {
                    provide: HealthService,
                    useValue: {
                        getHealth: jest.fn().mockResolvedValue({ status: 'ok', data: {} }),
                    },
                },
                {
                    provide: ClaudeUsageService,
                    useValue: new ClaudeUsageService(mockDb, mockRedis),
                },
                {
                    provide: AdminUsageService,
                    useValue: new AdminUsageService(mockDb),
                },
                {
                    provide: DRIZZLE,
                    useValue: mockDb,
                },
                {
                    provide: 'REDIS_CONNECTION',
                    useValue: mockRedis,
                },
            ],
        }).compile();

        controller = module.get<HealthController>(HealthController);
        claudeUsageService = module.get<ClaudeUsageService>(ClaudeUsageService);
        adminUsageService = module.get<AdminUsageService>(AdminUsageService);
        reflector = module.get<Reflector>(Reflector);
        rolesGuard = module.get<RolesGuard>(RolesGuard);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 1. REDIS SLIDING WINDOW TPM PRUNING TESTS
    // ─────────────────────────────────────────────────────────────────────────
    describe('Redis Sliding Window TPM Pruning (no bare TTL)', () => {
        it('should use ZADD, ZREMRANGEBYSCORE, and EXPIRE on write', async () => {
            const tokens = 2500;
            const now = Date.now();
            jest.spyOn(Date, 'now').mockReturnValue(now);

            await claudeUsageService.recordTpmEntry(tokens);

            const pipeline = mockRedis.pipeline();
            expect(mockRedis.pipeline).toHaveBeenCalled();
            expect(pipeline.zadd).toHaveBeenCalledWith(
                'claude:tpm:zset',
                now,
                expect.stringMatching(new RegExp(`^${now}:2500:`)),
            );
            // Must prune older than 60s
            expect(pipeline.zremrangebyscore).toHaveBeenCalledWith(
                'claude:tpm:zset',
                0,
                now - 60000,
            );
            expect(pipeline.expire).toHaveBeenCalledWith('claude:tpm:zset', 7200);
            expect(pipeline.exec).toHaveBeenCalled();
        });

        it('should actively prune with ZREMRANGEBYSCORE and query ZRANGEBYSCORE on read', async () => {
            const now = Date.now();
            jest.spyOn(Date, 'now').mockReturnValue(now);

            // Mock ZSET returning 2 entries in the window
            mockRedis.zrangebyscore.mockResolvedValue([
                `${now - 30000}:1500:uuid1`,
                `${now - 10000}:800:uuid2`,
            ]);

            const tpm = await claudeUsageService.getCurrentTpm();

            // Active pruning before read
            expect(mockRedis.zremrangebyscore).toHaveBeenCalledWith(
                'claude:tpm:zset',
                0,
                now - 60000,
            );
            expect(mockRedis.zrangebyscore).toHaveBeenCalledWith(
                'claude:tpm:zset',
                now - 60000,
                now,
            );
            // Sum = 1500 + 800 = 2300
            expect(tpm).toBe(2300);
        });

        it('should correctly sum in-memory sliding window when Redis is null', async () => {
            const inMemoryService = new ClaudeUsageService(mockDb, null);
            const now = 1000000;
            jest.spyOn(Date, 'now').mockReturnValue(now);

            await inMemoryService.recordTpmEntry(1000);
            await inMemoryService.recordTpmEntry(500);

            expect(await inMemoryService.getCurrentTpm()).toBe(1500);

            // Advance time past 60s (61,000 ms later)
            jest.spyOn(Date, 'now').mockReturnValue(now + 61000);
            expect(await inMemoryService.getCurrentTpm()).toBe(0); // Pruned!
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 2. AUTH & RBAC ROLES GUARD ON /health/claude
    // ─────────────────────────────────────────────────────────────────────────
    describe('RBAC Security on /health/claude & /health/claude/tenders', () => {
        it('should have Roles decorator with Admin and Super User on getClaudeHealth', () => {
            const roles = reflector.get<string[]>(ROLES_KEY, HealthController.prototype.getClaudeHealth);
            expect(roles).toBeDefined();
            expect(roles).toContain(RoleName.ADMIN);
            expect(roles).toContain(RoleName.SUPER_USER);
        });

        it('should have Roles decorator with Admin and Super User on getClaudeTenders', () => {
            const roles = reflector.get<string[]>(ROLES_KEY, HealthController.prototype.getClaudeTenders);
            expect(roles).toBeDefined();
            expect(roles).toContain(RoleName.ADMIN);
            expect(roles).toContain(RoleName.SUPER_USER);
        });

        function createMockContext(user: any, handler: any): ExecutionContext {
            return {
                getHandler: () => handler,
                getClass: () => HealthController,
                switchToHttp: () => ({
                    getRequest: () => ({ user }),
                }),
            } as any;
        }

        it('should reject unauthenticated request with ForbiddenException', () => {
            const context = createMockContext(null, HealthController.prototype.getClaudeHealth);
            expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
            expect(() => rolesGuard.canActivate(context)).toThrow('Not authenticated');
        });

        it('should reject non-admin roles (e.g. Executive, Engineer, Field) with 403', () => {
            const context1 = createMockContext(
                { id: 10, role: RoleName.EXECUTIVE },
                HealthController.prototype.getClaudeHealth,
            );
            expect(() => rolesGuard.canActivate(context1)).toThrow(ForbiddenException);

            const context2 = createMockContext(
                { id: 11, role: RoleName.FIELD },
                HealthController.prototype.getClaudeHealth,
            );
            expect(() => rolesGuard.canActivate(context2)).toThrow(ForbiddenException);

            const context3 = createMockContext(
                { id: 12, role: RoleName.ENGINEER },
                HealthController.prototype.getClaudeHealth,
            );
            expect(() => rolesGuard.canActivate(context3)).toThrow(ForbiddenException);
        });

        it('should allow Admin and Super User roles', () => {
            const adminCtx = createMockContext(
                { id: 1, role: RoleName.ADMIN },
                HealthController.prototype.getClaudeHealth,
            );
            expect(rolesGuard.canActivate(adminCtx)).toBe(true);

            const superUserCtx = createMockContext(
                { id: 2, role: RoleName.SUPER_USER },
                HealthController.prototype.getClaudeHealth,
            );
            expect(rolesGuard.canActivate(superUserCtx)).toBe(true);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 3. CALL TYPE & STAGE BREAKDOWN
    // ─────────────────────────────────────────────────────────────────────────
    describe('Call Type & Pipeline Stage Breakdown', () => {
        it('should insert separate rows for missing_field_fallback and ambiguity_resolution stages', async () => {
            const usageData = {
                stages: {
                    missing_field_fallback: {
                        call_type: 'missing_field_fallback',
                        model: 'claude-haiku-4-5-20251001',
                        input_tokens: 1200,
                        output_tokens: 300,
                        total_tokens: 1500,
                        estimated_cost_usd: 0.0027,
                        calls_count: 1,
                    },
                    ambiguity_resolution: {
                        call_type: 'ambiguity_resolution',
                        model: 'claude-sonnet-5',
                        input_tokens: 2000,
                        output_tokens: 400,
                        total_tokens: 2400,
                        estimated_cost_usd: 0.012,
                        calls_count: 1,
                    },
                },
            };

            await claudeUsageService.recordUsage({
                userId: 42,
                tenderId: 999,
                jobId: 'job_test_123',
                durationMs: 4500,
                usage: usageData as any,
            });

            const insertMock = mockDb.insert();
            expect(insertMock.values).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        userId: 42,
                        tenderId: 999,
                        jobId: 'job_test_123',
                        callType: 'missing_field_fallback',
                        model: 'claude-haiku-4-5-20251001',
                        totalTokens: 1500,
                    }),
                    expect.objectContaining({
                        userId: 42,
                        tenderId: 999,
                        jobId: 'job_test_123',
                        callType: 'ambiguity_resolution',
                        model: 'claude-sonnet-5',
                        totalTokens: 2400,
                    }),
                ]),
            );
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 4. ADMIN USAGE SERVICE RECONCILIATION
    // ─────────────────────────────────────────────────────────────────────────
    describe('AdminUsageService Reconciliation', () => {
        it('should report unconfigured status when ANTHROPIC_ADMIN_API_KEY is not set', async () => {
            delete process.env.ANTHROPIC_ADMIN_API_KEY;
            delete process.env.ANTHROPIC_ADMIN_KEY;

            const report = await adminUsageService.getReconciliationReport();
            expect(report.status).toBe('unconfigured');
            expect(report.anthropicVerifiedTokens).toBeNull();
            expect(report.message).toContain('ANTHROPIC_ADMIN_API_KEY not configured');
        });
    });
});
