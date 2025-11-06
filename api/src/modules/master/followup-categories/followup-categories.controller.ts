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
import { FollowupCategoriesService } from './followup-categories.service';

const CreateFollowupCategorySchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    status: z.boolean().optional().default(true),
});

const UpdateFollowupCategorySchema = CreateFollowupCategorySchema.partial();

type CreateFollowupCategoryDto = z.infer<typeof CreateFollowupCategorySchema>;
type UpdateFollowupCategoryDto = z.infer<typeof UpdateFollowupCategorySchema>;

@Controller('followup-categories')
export class FollowupCategoriesController {
    constructor(
        private readonly followupCategoriesService: FollowupCategoriesService,
    ) { }

    @Get()
    async list() {
        return this.followupCategoriesService.findAll();
    }

    @Get('search')
    async search(@Query('q') query: string) {
        if (!query) {
            return [];
        }
        return this.followupCategoriesService.search(query);
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        const category = await this.followupCategoriesService.findById(id);
        if (!category) {
            throw new NotFoundException(
                `Followup Category with ID ${id} not found`,
            );
        }
        return category;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateFollowupCategorySchema.parse(body);
        return this.followupCategoriesService.create(parsed);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateFollowupCategorySchema.parse(body);
        return this.followupCategoriesService.update(id, parsed);
    }

    // @Delete(':id')
    // @HttpCode(HttpStatus.NO_CONTENT)
    // async delete(@Param('id', ParseIntPipe) id: number) {
    //     await this.followupCategoriesService.delete(id);
    // }
}
