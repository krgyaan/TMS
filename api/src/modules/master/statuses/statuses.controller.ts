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
} from '@nestjs/common';
import { z } from 'zod';
import { StatusesService } from '@/modules/master/statuses/statuses.service';

const CreateStatusSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    tenderCategory: z
        .string()
        .max(100, 'Category cannot exceed 100 characters')
        .default('prep'),
    status: z.boolean().optional().default(true),
});

const UpdateStatusSchema = CreateStatusSchema.partial();

type CreateStatusDto = z.infer<typeof CreateStatusSchema>;
type UpdateStatusDto = z.infer<typeof UpdateStatusSchema>;

@Controller('statuses')
export class StatusesController {
    constructor(private readonly statusesService: StatusesService) { }

    @Get()
    async list() {
        return this.statusesService.findAll();
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.statusesService.findById(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateStatusSchema.parse(body);
        const payload: CreateStatusDto = {
            ...parsed,
            tenderCategory:
                parsed.tenderCategory ?? 'prep',
            name: parsed.name.trim(),
        };
        return this.statusesService.create(payload);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const parsed = UpdateStatusSchema.parse(body);
        const payload: UpdateStatusDto = {
            ...parsed,
            tenderCategory:
                parsed.tenderCategory === undefined
                    ? 'prep'
                    : parsed.tenderCategory ?? 'prep',
            name: parsed.name?.trim() ?? parsed.name,
        };
        return this.statusesService.update(id, payload);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.statusesService.delete(id);
    }
}
