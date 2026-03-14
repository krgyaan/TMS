import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { SubmitQueriesService } from './submit-queries.service';
import { CreateSubmitQueriesDto, CreateSubmitQueriesSchema, UpdateSubmitQueriesSchema } from './dto/submit-queries.dto';

@Controller('submit-queries')
export class SubmitQueriesController {
    constructor(private readonly submitQueriesService: SubmitQueriesService) { }

    @Get()
    async list(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('search') search?: string,
    ) {
        const filters = {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
            search,
        };
        return this.submitQueriesService.findAll(filters);
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.submitQueriesService.findById(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateSubmitQueriesSchema.parse(body) as CreateSubmitQueriesDto;
        return this.submitQueriesService.create(parsed);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const parsed = UpdateSubmitQueriesSchema.parse(body) as CreateSubmitQueriesDto;
        return this.submitQueriesService.update(id, parsed);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.submitQueriesService.delete(id);
    }
}
