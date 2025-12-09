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
import { IndustriesService } from '@/modules/master/industries/industries.service';

const CreateIndustrySchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().max(500).optional(),
    status: z.boolean().optional().default(true),
});

const UpdateIndustrySchema = CreateIndustrySchema.partial();

@Controller('industries')
export class IndustriesController {
    constructor(private readonly industriesService: IndustriesService) { }

    @Get()
    async list() {
        return this.industriesService.findAll();
    }

    @Get('search')
    async search(@Query('q') query: string) {
        if (!query) return [];
        // return this.industriesService.search(query);
        return [];
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        const industry = await this.industriesService.findById(id);
        if (!industry) {
            throw new NotFoundException(`Industry with ID ${id} not found`);
        }
        return industry;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateIndustrySchema.parse(body);
        return this.industriesService.create(parsed);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateIndustrySchema.parse(body);
        return this.industriesService.update(id, parsed);
    }

}
