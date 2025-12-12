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
import { RolesService } from '@/modules/master/roles/roles.service';

const CreateRoleSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(500).optional(),
    status: z.boolean().optional().default(true),
});

const UpdateRoleSchema = CreateRoleSchema.partial();

const AssignPermissionsSchema = z.object({
    permissionIds: z.array(z.number()).min(1, 'At least one permission is required'),
});

@Controller('roles')
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    @Get()
    async list() {
        return this.rolesService.findAll();
    }

    @Get('search')
    async search(@Query('q') query: string) {
        if (!query) return [];
        // return this.rolesService.search(query);
        return [];
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        const role = await this.rolesService.findById(id);
        if (!role) {
            throw new NotFoundException(`Role with ID ${id} not found`);
        }
        return role;
    }

    @Get(':id/permissions')
    async getRolePermissions(@Param('id', ParseIntPipe) id: number) {
        return this.rolesService.getRolePermissions(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateRoleSchema.parse(body);
        return this.rolesService.create(parsed);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateRoleSchema.parse(body);
        return this.rolesService.update(id, parsed);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.rolesService.delete(id);
    }

    @Post(':id/permissions')
    @HttpCode(HttpStatus.OK)
    async assignPermissions(
        @Param('id', ParseIntPipe) roleId: number,
        @Body() body: unknown,
    ) {
        const parsed = AssignPermissionsSchema.parse(body);
        await this.rolesService.assignPermissions(roleId, parsed.permissionIds);
        return { message: 'Permissions assigned successfully' };
    }

    @Delete(':id/permissions/:permissionId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async removePermission(
        @Param('id', ParseIntPipe) roleId: number,
        @Param('permissionId', ParseIntPipe) permissionId: number,
    ) {
        await this.rolesService.removePermission(roleId, permissionId);
    }
}
