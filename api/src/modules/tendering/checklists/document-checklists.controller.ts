import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { DocumentChecklistsService, type DocumentChecklistFilters } from '@/modules/tendering/checklists/document-checklists.service';
import { CreateDocumentChecklistDto, UpdateDocumentChecklistDto } from '@/modules/tendering/checklists/dto/document-checklist.dto';

@Controller('document-checklists')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class DocumentChecklistsController {
    constructor(private readonly documentChecklistsService: DocumentChecklistsService) { }

    @Get()
    findAll(
        @Query('checklistSubmitted') checklistSubmitted?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };

        const parseBoolean = (v?: string): boolean | undefined => {
            if (v === 'true') return true;
            if (v === 'false') return false;
            return undefined;
        };

        const filters: DocumentChecklistFilters = {
            ...(parseBoolean(checklistSubmitted) !== undefined && { checklistSubmitted: parseBoolean(checklistSubmitted) }),
            ...(parseNumber(page) && { page: parseNumber(page) }),
            ...(parseNumber(limit) && { limit: parseNumber(limit) }),
            ...(sortBy && { sortBy }),
            ...(sortOrder && { sortOrder }),
        };

        return this.documentChecklistsService.findAll(filters);
    }

    @Get('counts')
    getCounts() {
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
