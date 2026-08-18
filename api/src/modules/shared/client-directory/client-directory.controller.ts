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
import { CurrentUser } from '@/decorators/current-user.decorator';

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
    async create(@Body() body: unknown, @CurrentUser() user: { id: number; name: string }) {
        const parsed = CreateClientDirectorySchema.parse(body) as CreateClientDirectoryDto;
        return this.clientDirectoryService.create(parsed, user);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
        @CurrentUser() user: { id: number; name: string },
    ) {
        const parsed = UpdateClientDirectorySchema.parse(body) as UpdateClientDirectoryDto;
        return this.clientDirectoryService.update(id, parsed, user);
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
