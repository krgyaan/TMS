import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { RequestExtensionsService } from './request-extension.service';
import { CreateRequestExtensionDto, CreateRequestExtensionSchema, UpdateRequestExtensionDto, UpdateRequestExtensionSchema } from './dto/request-extension.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('request-extensions')
export class RequestExtensionsController {
    constructor(private readonly requestExtensionsService: RequestExtensionsService) { }

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
        return this.requestExtensionsService.findAll(filters);
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.requestExtensionsService.findById(id);
    }

    @Get('tender/:tenderId')
    async getByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.requestExtensionsService.findByTenderId(tenderId);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateRequestExtensionSchema.parse(body) as CreateRequestExtensionDto;
        return this.requestExtensionsService.create(parsed);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateRequestExtensionSchema.parse(body) as UpdateRequestExtensionDto;
        return this.requestExtensionsService.update(id, parsed);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.requestExtensionsService.delete(id);
    }
}
