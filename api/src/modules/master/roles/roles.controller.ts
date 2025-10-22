import { Body, Controller, Get, Post } from '@nestjs/common';
import { z } from 'zod';
import { RolesService } from './roles.service';

const CreateRoleSchema = z.object({
  name: z.string().min(1),
  guardName: z.string().min(1).optional(),
});

type CreateRoleDto = z.infer<typeof CreateRoleSchema>;

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async list() {
    return this.rolesService.findAll();
  }

  @Post()
  async create(@Body() body: unknown) {
    const parsed = CreateRoleSchema.parse(body);
    return this.rolesService.create(parsed);
  }
}
