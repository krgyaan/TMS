import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Query,
    Logger,
} from '@nestjs/common';
import { RfqsService } from '@/modules/tendering/rfqs/rfq.service';
import type { CreateRfqDto, UpdateRfqDto } from '@/modules/tendering/rfqs/dto/rfq.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { type TimerData, WorkflowService } from '@/modules/timers/services/workflow.service';


@Controller('rfqs')
export class RfqsController {
    private readonly logger = new Logger(RfqsController.name);
    constructor(
        private readonly rfqsService: RfqsService,
        private readonly workflowService: WorkflowService
    ) { }

    @Get('dashboard')
    async getDashboard(
        @Query('tab') tab?: 'pending' | 'sent' | 'rfq-rejected' | 'tender-dnb',
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        const result = await this.rfqsService.getRfqData(tab, {
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
                    timer = await this.workflowService.getTimerForStep('TENDER', tender.tenderId, 'rfq_sent');
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
    getDashboardCounts() {
        return this.rfqsService.getDashboardCounts();
    }

    @Get('by-tender/:tenderId')
    async getByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        const rfq = await this.rfqsService.findByTenderId(tenderId);
        if (!rfq) {
            throw new NotFoundException(`RFQ for Tender ID ${tenderId} not found`);
        }
        return rfq;
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        const rfq = await this.rfqsService.findById(id);
        if (!rfq) {
            throw new NotFoundException(`RFQ with ID ${id} not found`);
        }
        return rfq;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() body: CreateRfqDto,
        @CurrentUser() user: ValidatedUser
    ) {
        return this.rfqsService.create(body, user.sub);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateRfqDto) {
        return this.rfqsService.update(id, body);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.rfqsService.delete(id);
    }
}
