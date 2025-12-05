import {
    Body,
    Controller,
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

}
