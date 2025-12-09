import {
    Body,
    Controller,
    Delete,
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
import { LeadTypesService } from '@/modules/master/lead-types/lead-types.service';

const CreateLeadTypeSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(500).optional(),
    status: z.boolean().optional().default(true),
});

const UpdateLeadTypeSchema = CreateLeadTypeSchema.partial();

type CreateLeadTypeDto = z.infer<typeof CreateLeadTypeSchema>;
type UpdateLeadTypeDto = z.infer<typeof UpdateLeadTypeSchema>;

@Controller('lead-types')
export class LeadTypesController {
    constructor(private readonly leadTypesService: LeadTypesService) { }

    @Get()
    async list() {
        return this.leadTypesService.findAll();
    }

    @Get('search')
    async search(@Query('q') query: string) {
        if (!query) {
            return [];
        }
        // return this.leadTypesService.search(query);
        return [];
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        const leadType = await this.leadTypesService.findById(id);
        if (!leadType) {
            throw new NotFoundException(`Lead Type with ID ${id} not found`);
        }
        return leadType;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateLeadTypeSchema.parse(body);
        return this.leadTypesService.create(parsed);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateLeadTypeSchema.parse(body);
        return this.leadTypesService.update(id, parsed);
    }

    // @Delete(':id')
    // @HttpCode(HttpStatus.NO_CONTENT)
    // async delete(@Param('id', ParseIntPipe) id: number) {
    //     await this.leadTypesService.delete(id);
    // }
}
