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
import { PhysicalDocsService } from '@/modules/tendering/physical-docs/physical-docs.service';
import type { CreatePhysicalDocDto, UpdatePhysicalDocDto } from '@/modules/tendering/physical-docs/dto/physical-docs.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';


@Controller('physical-docs')
export class PhysicalDocsController {
    constructor(private readonly physicalDocsService: PhysicalDocsService) { }

    @Get('dashboard')
    async getDashboard(
        @Query('tab') tab?: 'pending' | 'sent' | 'tender-dnb',
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        return this.physicalDocsService.getDashboardData(tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
    }

    @Get('dashboard/counts')
    async getDashboardCounts() {
        return this.physicalDocsService.getDashboardCounts();
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
