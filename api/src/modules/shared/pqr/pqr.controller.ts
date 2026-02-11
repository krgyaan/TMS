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
import { PqrService } from './pqr.service';
import { CreatePqrSchema, UpdatePqrSchema } from './dto/pqr.dto';
import type { CreatePqrDto, UpdatePqrDto } from './dto/pqr.dto';

@Controller('pqr')
export class PqrController {
    constructor(private readonly pqrService: PqrService) { }

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
        return this.pqrService.findAll(filters);
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.pqrService.findById(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreatePqrSchema.parse(body) as CreatePqrDto;
        return this.pqrService.create(parsed);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const parsed = UpdatePqrSchema.parse(body) as UpdatePqrDto;
        return this.pqrService.update(id, parsed);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.pqrService.delete(id);
    }
}
