import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { z } from 'zod';
import { LocationsService } from '@/modules/master/locations/locations.service';

const CreateLocationSchema = z.object({
    name: z
        .string()
        .min(1, 'Name is required')
        .max(100, 'Name cannot be longer than 100 characters'),
    state: z
        .string()
        .max(100, 'State cannot be longer than 100 characters')
        .optional()
        .nullable(),
    region: z
        .string()
        .max(100, 'Region cannot be longer than 100 characters')
        .optional()
        .nullable(),
    acronym: z
        .string()
        .max(20, 'Acronym cannot be longer than 20 characters')
        .optional()
        .nullable(),
    status: z.boolean().optional().default(true),
});

const UpdateLocationSchema = CreateLocationSchema.partial();

type CreateLocationDto = z.infer<typeof CreateLocationSchema>;
type UpdateLocationDto = z.infer<typeof UpdateLocationSchema>;

@Controller('locations')
export class LocationsController {
    constructor(private readonly locationsService: LocationsService) { }

    @Get()
    async list() {
        return this.locationsService.findAll();
    }

    @Get('search')
    async search(@Query('q') query: string) {
        if (!query) {
            return [];
        }
        return this.locationsService.search(query);
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.locationsService.findById(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateLocationSchema.parse(body);
        const payload: CreateLocationDto = {
            ...parsed,
            name: parsed.name.trim(),
            acronym: parsed.acronym?.trim() || null,
            state: parsed.state?.trim() || null,
            region: parsed.region?.trim() || null,
            status: parsed.status ?? true,
        };
        return this.locationsService.create(payload);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const parsed = UpdateLocationSchema.parse(body);
        const payload: UpdateLocationDto = {
            ...parsed,
            name: parsed.name?.trim(),
            acronym:
                parsed.acronym === undefined
                    ? parsed.acronym
                    : parsed.acronym?.trim() || null,
            state:
                parsed.state === undefined
                    ? parsed.state
                    : parsed.state?.trim() || null,
            region:
                parsed.region === undefined
                    ? parsed.region
                    : parsed.region?.trim() || null,
        };
        return this.locationsService.update(id, payload);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.locationsService.delete(id);
    }
}
