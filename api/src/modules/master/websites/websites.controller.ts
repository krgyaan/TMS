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
import { WebsitesService } from './websites.service';

const CreateWebsiteSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    url: z.string().url('Invalid URL format').max(255).optional(),
    status: z.boolean().optional().default(true),
});

const UpdateWebsiteSchema = CreateWebsiteSchema.partial();

type CreateWebsiteDto = z.infer<typeof CreateWebsiteSchema>;
type UpdateWebsiteDto = z.infer<typeof UpdateWebsiteSchema>;

@Controller('websites')
export class WebsitesController {
    constructor(private readonly websitesService: WebsitesService) { }

    @Get()
    async list() {
        return this.websitesService.findAll();
    }

    @Get('search')
    async search(@Query('q') query: string) {
        if (!query) {
            return [];
        }
        return this.websitesService.search(query);
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        const website = await this.websitesService.findById(id);
        if (!website) {
            throw new NotFoundException(`Website with ID ${id} not found`);
        }
        return website;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateWebsiteSchema.parse(body);
        return this.websitesService.create(parsed);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateWebsiteSchema.parse(body);
        return this.websitesService.update(id, parsed);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.websitesService.delete(id);
    }
}
