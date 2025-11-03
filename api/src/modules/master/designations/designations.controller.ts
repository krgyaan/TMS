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
import { DesignationsService } from './designations.service';

const CreateDesignationSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    status: z.boolean().optional().default(true),
});

const UpdateDesignationSchema = CreateDesignationSchema.partial();

type CreateDesignationDto = z.infer<typeof CreateDesignationSchema>;
type UpdateDesignationDto = z.infer<typeof UpdateDesignationSchema>;

@Controller('designations')
export class DesignationsController {
    constructor(
        private readonly designationsService: DesignationsService,
    ) { }

    @Get()
    async list() {
        return this.designationsService.findAll();
    }

    @Get('search')
    async search(@Query('q') query: string) {
        if (!query) {
            return [];
        }
        return this.designationsService.search(query);
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        const category = await this.designationsService.findById(id);
        if (!category) {
            throw new NotFoundException(
                `Designation with ID ${id} not found`,
            );
        }
        return category;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateDesignationSchema.parse(body);
        return this.designationsService.create(parsed);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateDesignationSchema.parse(body);
        return this.designationsService.update(id, parsed);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.designationsService.delete(id);
    }
}
