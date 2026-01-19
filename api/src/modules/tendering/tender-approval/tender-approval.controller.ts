import { Controller, Get, Put, Param, Body, ParseIntPipe, Query } from '@nestjs/common';
import { TenderApprovalService, type TenderApprovalFilters } from '@/modules/tendering/tender-approval/tender-approval.service';
import { TenderApprovalPayloadSchema, type TenderApprovalPayload } from '@/modules/tendering/tender-approval/dto/tender-approval.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { type TimerData, WorkflowService } from '@/modules/timers/services/workflow.service';
import { Logger } from '@nestjs/common';

@Controller('tender-approvals')
export class TenderApprovalController {
    private readonly logger = new Logger(TenderApprovalController.name);
    constructor(
        private readonly tenderApprovalService: TenderApprovalService,
        private readonly workflowService: WorkflowService
    ) { }

    @Get('dashboard')
    async getDashboard(
        @Query('tabKey') tabKey: 'pending' | 'accepted' | 'rejected' | 'tender-dnb',
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        const result = await this.tenderApprovalService.getDashboardData(tabKey, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
        // Add timer data to each tender
        const dataWithTimers = await Promise.all(
            result.data.map(async (tender) => {
                let timer: TimerData | null = null;
                try {
                    timer = await this.workflowService.getTimerForStep('TENDER', tender.tenderId, 'tender_approval');
                    if (!timer.hasTimer) {
                        timer = null;
                    }
                } catch (error) {
                    this.logger.error(
                        `Failed to get timer for tender ${tender.tenderId}:`,
                        error
                    );
                }

                return {
                    ...tender,
                    timer
                };
            })
        );

        return {
            ...result,
            data: dataWithTimers
        };
    }

    @Get('dashboard/counts')
    async getDashboardCounts() {
        return this.tenderApprovalService.getCounts();
    }

    @Get(':id/approval')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.tenderApprovalService.getByTenderId(id);
    }

    @Put(':tenderId/approval')
    async createOrUpdateApproval(
        @Param('tenderId', ParseIntPipe) tenderId: number,
        @Body() body: unknown,
        @CurrentUser() user: ValidatedUser
    ) {
        const data = TenderApprovalPayloadSchema.parse(body);
        return this.tenderApprovalService.updateApproval(tenderId, data, user.sub);
    }
}
