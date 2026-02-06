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
import { TimersService } from '@/modules/timers/timers.service';
import type { TimerWithComputed } from '@/modules/timers/timer.types';
import { transformTimerForFrontend } from '@/modules/timers/timer-transform';


@Controller('rfqs')
export class RfqsController {
    private readonly logger = new Logger(RfqsController.name);
    constructor(
        private readonly rfqsService: RfqsService,
        private readonly timersService: TimersService
    ) { }

    @Get('dashboard')
    async getDashboard(
        @CurrentUser() user: ValidatedUser,
        @Query('tab') tab?: 'pending' | 'sent' | 'rfq-rejected' | 'tender-dnb',
        @Query('teamId') teamId?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };
        const result = await this.rfqsService.getRfqData(user, parseNumber(teamId), tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
        // Add timer data to each tender
        // COMMENTED OUT: Timer functionality temporarily disabled
        // const dataWithTimers = await Promise.all(
        //     result.data.map(async (tender) => {
        //         let timer: TimerWithComputed | null = null;
        //         try {
        //             timer = await this.timersService.getTimer('TENDER', tender.tenderId, 'rfq_sent');
        //         } catch (error) {
        //             this.logger.error(
        //                 `Failed to get timer for tender ${tender.tenderId}:`,
        //                 error
        //             );
        //         }

        //         return {
        //             ...tender,
        //             timer: transformTimerForFrontend(timer, 'rfq_sent')
        //         };
        //     })
        // );
        const dataWithTimers = result.data.map((tender) => {
            return {
                ...tender,
                timer: transformTimerForFrontend(null, 'rfq_sent')
            };
        });

        return {
            ...result,
            data: dataWithTimers
        };
    }

    @Get('dashboard/counts')
    getDashboardCounts(
        @CurrentUser() user: ValidatedUser,
        @Query('teamId') teamId?: string,
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };
        return this.rfqsService.getDashboardCounts(user, parseNumber(teamId));
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
