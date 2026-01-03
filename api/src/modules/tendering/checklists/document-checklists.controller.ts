import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { DocumentChecklistsService, type DocumentChecklistFilters } from '@/modules/tendering/checklists/document-checklists.service';
import type { CreateDocumentChecklistDto, UpdateDocumentChecklistDto } from '@/modules/tendering/checklists/dto/document-checklist.dto';

@Controller('document-checklists')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class DocumentChecklistsController {
    constructor(private readonly documentChecklistsService: DocumentChecklistsService) { }

    @Get('dashboard')
    getDashboard(
        @Query('tab') tab?: 'pending' | 'submitted' | 'tender-dnb',
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        return this.documentChecklistsService.getDashboardData(tab, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        });
    }

    @Get('dashboard/counts')
    getDashboardCounts() {
        return this.documentChecklistsService.getDashboardCounts();
    }

    @Get('tender/:tenderId')
    findByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.documentChecklistsService.findByTenderId(tenderId);
    }

    @Post()
    create(@Body() createDocumentChecklistDto: CreateDocumentChecklistDto) {
        return this.documentChecklistsService.create(createDocumentChecklistDto);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateDocumentChecklistDto: UpdateDocumentChecklistDto,
    ) {
        return this.documentChecklistsService.update(id, updateDocumentChecklistDto);
    }
}
