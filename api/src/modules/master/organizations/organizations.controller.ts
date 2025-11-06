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
import { OrganizationsService } from './organizations.service';

const CreateOrganizationSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    acronym: z.string().max(50).optional(),
    industryId: z.number().optional(),
    status: z.boolean().optional().default(true),
});

const UpdateOrganizationSchema = CreateOrganizationSchema.partial();

type CreateOrganizationDto = z.infer<typeof CreateOrganizationSchema>;
type UpdateOrganizationDto = z.infer<typeof UpdateOrganizationSchema>;

@Controller('organizations')
export class OrganizationsController {
    constructor(
        private readonly organizationsService: OrganizationsService,
    ) { }

    @Get()
    async list() {
        return this.organizationsService.findAll();
    }

    @Get('search')
    async search(@Query('q') query: string) {
        if (!query) {
            return [];
        }
        // return this.organizationsService.search(query);
        return [];
    }

    @Get('industry/:industryId')
    async getByIndustry(@Param('industryId', ParseIntPipe) industryId: number) {
        return this.organizationsService.findByIndustry(industryId);
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.organizationsService.findById(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateOrganizationSchema.parse(body);
        return this.organizationsService.create(parsed);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const parsed = UpdateOrganizationSchema.parse(body);
        return this.organizationsService.update(id, parsed);
    }

    // @Delete(':id')
    // @HttpCode(HttpStatus.NO_CONTENT)
    // async delete(@Param('id', ParseIntPipe) id: number) {
    //   await this.organizationsService.delete(id);
    // }
}
