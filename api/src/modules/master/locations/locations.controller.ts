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
import { LocationsService } from './locations.service';

// Validation Schema
const CreateLocationSchema = z.object({
    name: z.string()
        .min(1, 'Name is required')
        .max(100, 'Name cannot be longer than 100 characters'),
    address: z.string().max(500).optional(),
    state: z.string().max(100).optional(),
    acronym: z.string().max(20).optional(),
    region: z.string().max(100).optional(),
    status: z.boolean().optional().default(true),
});

const UpdateLocationSchema = CreateLocationSchema.partial();

type CreateLocationDto = z.infer<typeof CreateLocationSchema>;
type UpdateLocationDto = z.infer<typeof UpdateLocationSchema>;

@Controller('locations')
export class LocationsController {
    constructor(private readonly locationsService: LocationsService) { }

    /**
     * GET /locations
     * List all locations
     */
    @Get()
    async list() {
        return this.locationsService.findAll();
    }

    /**
     * GET /locations/search?q=mumbai
     * Search locations
     */
    @Get('search')
    async search(@Query('q') query: string) {
        if (!query) {
            return [];
        }
        //   return this.locationsService.search(query);
        return [];
    }


    /**
     * GET /locations/:id
     * Get single location
     */
    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        const location = await this.locationsService.findById(id);
        if (!location) {
            throw new NotFoundException(`Location with ID ${id} not found`);
        }
        return location;
    }

    /**
     * POST /locations
     * Create new location
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateLocationSchema.parse(body);
        return this.locationsService.create(parsed);
    }

    /**
     * PATCH /locations/:id
     * Update location
     */
    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const parsed = UpdateLocationSchema.parse(body);
        return this.locationsService.update(id, parsed);
    }

    /**
     * DELETE /locations/:id
     * Soft delete location
     */
    // @Delete(':id')
    // @HttpCode(HttpStatus.NO_CONTENT)
    // async delete(@Param('id', ParseIntPipe) id: number) {
    //   await this.locationsService.delete(id);
    // }
}
