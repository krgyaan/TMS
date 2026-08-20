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
import { HappyCallingService } from './happy-calling.service';
import { CreateHappyCallingSchema, UpdateHappyCallingSchema } from './dto/happy-calling.dto';
import type { CreateHappyCallingDto, UpdateHappyCallingDto } from './dto/happy-calling.dto';

@Controller('happy-calling')
export class HappyCallingController {
    constructor(private readonly happyCallingService: HappyCallingService) {}

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
        return this.happyCallingService.findAll(filters);
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.happyCallingService.findById(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateHappyCallingSchema.parse(body) as CreateHappyCallingDto;
        return this.happyCallingService.create(parsed);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateHappyCallingSchema.parse(body) as UpdateHappyCallingDto;
        return this.happyCallingService.update(id, parsed);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.happyCallingService.delete(id);
    }
}