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
import { CurrentUser } from '@/decorators/current-user.decorator';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/modules/auth/guards/permission.guard';
import { CanRead, CanCreate, CanUpdate, CanDelete } from '@/modules/auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('happy-calling')
export class HappyCallingController {
    constructor(private readonly happyCallingService: HappyCallingService) {}

    @Get()
    @CanRead('crm.happy_calling')
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
    @CanRead('crm.happy_calling')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.happyCallingService.findById(id);
    }

    @Post()
    @CanCreate('crm.happy_calling')
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown, @CurrentUser() user: { sub: number }) {
        const parsed = CreateHappyCallingSchema.parse(body) as CreateHappyCallingDto;
        return this.happyCallingService.create(parsed, user?.sub);
    }

    @Patch(':id')
    @CanUpdate('crm.happy_calling')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateHappyCallingSchema.parse(body) as UpdateHappyCallingDto;
        return this.happyCallingService.update(id, parsed);
    }

    @Delete(':id')
    @CanDelete('crm.happy_calling')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.happyCallingService.delete(id);
    }
}