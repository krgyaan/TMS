import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    ParseIntPipe,
    Post,
} from '@nestjs/common';
import { z } from 'zod';
import { PermissionsService } from '@/modules/master/permissions/permissions.service';

const CreatePermissionSchema = z.object({
    module: z.string().min(1, 'Module is required').max(100),
    action: z.string().min(1, 'Action is required').max(50),
    description: z.string().max(500).optional(),
});

@Controller('permissions')
export class PermissionsController {
    constructor(private readonly permissionsService: PermissionsService) {}

    @Get()
    async list() {
        return this.permissionsService.findAll();
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        const permission = await this.permissionsService.findById(id);
        if (!permission) {
            throw new NotFoundException(`Permission with ID ${id} not found`);
        }
        return permission;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreatePermissionSchema.parse(body);
        return this.permissionsService.create(parsed);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.permissionsService.delete(id);
    }
}
