import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe } from '@nestjs/common';
import { DocumentChecklistsService } from '@/modules/tendering/checklists/document-checklists.service';
import { CreateDocumentChecklistDto, UpdateDocumentChecklistDto } from '@/modules/tendering/checklists/dto/document-checklist.dto';

@Controller('document-checklists')
export class DocumentChecklistsController {
    constructor(private readonly documentChecklistsService: DocumentChecklistsService) { }

    @Get()
    findAll() {
        return this.documentChecklistsService.findAll();
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
