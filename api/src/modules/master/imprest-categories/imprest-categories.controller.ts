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
import { ImprestCategoriesService } from './imprest-categories.service';

const CreateImprestCategorySchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    heading: z.string().max(100).optional(),
    status: z.boolean().optional().default(true),
});

const UpdateImprestCategorySchema = CreateImprestCategorySchema.partial();

type CreateImprestCategoryDto = z.infer<typeof CreateImprestCategorySchema>;
type UpdateImprestCategoryDto = z.infer<typeof UpdateImprestCategorySchema>;

@Controller('imprest-categories')
export class ImprestCategoriesController {
    constructor(
        private readonly imprestCategoriesService: ImprestCategoriesService,
    ) { }

    @Get()
    async list() {
        return this.imprestCategoriesService.findAll();
    }

    @Get('search')
    async search(@Query('q') query: string) {
        if (!query) {
            return [];
        }
        // return this.imprestCategoriesService.search(query);
        return [];
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        const category = await this.imprestCategoriesService.findById(id);
        if (!category) {
            throw new NotFoundException(
                `Imprest Category with ID ${id} not found`,
            );
        }
        return category;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateImprestCategorySchema.parse(body);
        return this.imprestCategoriesService.create(parsed);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateImprestCategorySchema.parse(body);
        return this.imprestCategoriesService.update(id, parsed);
    }

    // @Delete(':id')
    // @HttpCode(HttpStatus.NO_CONTENT)
    // async delete(@Param('id', ParseIntPipe) id: number) {
    //     await this.imprestCategoriesService.delete(id);
    // }
}
