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
} from '@nestjs/common';
import { RfqsService } from '@/modules/tendering/rfqs/rfq.service';
import type { CreateRfqDto, UpdateRfqDto } from '@/modules/tendering/rfqs/dto/rfq.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';


@Controller('rfqs')
export class RfqsController {
    constructor(private readonly rfqsService: RfqsService) { }

    @Get('dashboard')
    async getDashboard(
        @Query('tab') tab?: 'pending' | 'sent' | 'rfq-rejected' | 'tender-dnb',
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        return this.rfqsService.getRfqData(tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
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
