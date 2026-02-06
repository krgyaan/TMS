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
import { PhysicalDocsService } from '@/modules/tendering/physical-docs/physical-docs.service';
import type { CreatePhysicalDocDto, UpdatePhysicalDocDto } from '@/modules/tendering/physical-docs/dto/physical-docs.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { TimersService } from '@/modules/timers/timers.service';
import type { TimerWithComputed } from '@/modules/timers/timer.types';
import { transformTimerForFrontend } from '@/modules/timers/timer-transform';


@Controller('physical-docs')
export class PhysicalDocsController {
    private readonly logger = new Logger(PhysicalDocsController.name);
    constructor(
        private readonly physicalDocsService: PhysicalDocsService,
        private readonly timersService: TimersService
    ) { }

    @Get('dashboard')
    async getDashboard(
        @CurrentUser() user: ValidatedUser,
        @Query('tab') tab?: 'pending' | 'sent' | 'tender-dnb',
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
        const result = await this.physicalDocsService.getDashboardData(user, parseNumber(teamId), tab, {
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
        //             timer = await this.timersService.getTimer('TENDER', tender.tenderId, 'physical_docs');
        //         } catch (error) {
        //             this.logger.error(
        //                 `Failed to get timer for tender ${tender.tenderId}:`,
        //                 error
        //             );
        //         }

        //         return {
        //             ...tender,
        //             timer: transformTimerForFrontend(timer, 'physical_docs')
        //         };
        //     })
        // );
        const dataWithTimers = result.data.map((tender) => {
            return {
                ...tender,
                timer: transformTimerForFrontend(null, 'physical_docs')
            };
        });

        return {
            ...result,
            data: dataWithTimers
        };
    }

    @Get('dashboard/counts')
    async getDashboardCounts(
        @CurrentUser() user: ValidatedUser,
        @Query('teamId') teamId?: string,
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };
        return this.physicalDocsService.getDashboardCounts(user, parseNumber(teamId));
    }

    @Get('by-tender/:tenderId')
    async getByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        const physicalDoc = await this.physicalDocsService.findByTenderIdWithPersons(tenderId);
        if (!physicalDoc) {
            throw new NotFoundException(`Physical doc for tender ID ${tenderId} not found`);
        }
        return physicalDoc;
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        const physicalDoc = await this.physicalDocsService.findById(id);
        if (!physicalDoc) {
            throw new NotFoundException(`Physical doc with ID ${id} not found`);
        }
        return physicalDoc;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() body: CreatePhysicalDocDto,
        @CurrentUser() user: ValidatedUser
    ) {
        return this.physicalDocsService.create(body, user.sub);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdatePhysicalDocDto) {
        return this.physicalDocsService.update(id, body);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.physicalDocsService.delete(id);
    }
}
