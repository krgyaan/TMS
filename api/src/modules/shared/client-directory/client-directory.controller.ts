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
import { ClientDirectoryService } from './client-directory.service';
import { CreateClientDirectorySchema, UpdateClientDirectorySchema } from './dto/client-directory.dto';
import type { CreateClientDirectoryDto, UpdateClientDirectoryDto } from './dto/client-directory.dto';

@Controller('client-directory')
export class ClientDirectoryController {
    constructor(private readonly clientDirectoryService: ClientDirectoryService) {}

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
        return this.clientDirectoryService.findAll(filters);
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.clientDirectoryService.findById(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateClientDirectorySchema.parse(body) as CreateClientDirectoryDto;
        return this.clientDirectoryService.create(parsed);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateClientDirectorySchema.parse(body) as UpdateClientDirectoryDto;
        return this.clientDirectoryService.update(id, parsed);
    }

    @Post('sync-all')
    @HttpCode(HttpStatus.OK)
    async syncAll() {
        return this.clientDirectoryService.syncAll();
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.clientDirectoryService.delete(id);
    }
}
