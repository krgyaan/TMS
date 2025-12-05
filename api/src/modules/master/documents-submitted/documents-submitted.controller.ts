import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    HttpCode,
    HttpStatus,
    NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import { DocumentsSubmittedService } from '@/modules/master/documents-submitted/documents-submitted.service';

const CreateDocumentSubmittedSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    status: z.boolean().optional().default(true),
});

const UpdateDocumentSubmittedSchema = CreateDocumentSubmittedSchema.partial();

type CreateDocumentSubmittedDto = z.infer<
    typeof CreateDocumentSubmittedSchema
>;
type UpdateDocumentSubmittedDto = z.infer<
    typeof UpdateDocumentSubmittedSchema
>;

@Controller('documents-submitted')
export class DocumentsSubmittedController {
    constructor(
        private readonly documentsSubmittedService: DocumentsSubmittedService,
    ) { }

    @Get()
    async list() {
        return this.documentsSubmittedService.findAll();
    }

    @Get('search')
    async search(@Query('q') query: string) {
        if (!query) {
            return [];
        }
        // return this.documentsSubmittedService.search(query);
        return [];
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        const document = await this.documentsSubmittedService.findById(id);
        if (!document) {
            throw new NotFoundException(`Document type with ID ${id} not found`);
        }
        return document;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateDocumentSubmittedSchema.parse(body);
        return this.documentsSubmittedService.create(parsed);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateDocumentSubmittedSchema.parse(body);
        return this.documentsSubmittedService.update(id, parsed);
    }
}
