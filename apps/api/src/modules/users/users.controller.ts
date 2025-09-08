import { Body, Controller, Get, Post } from '@nestjs/common';
import { z } from 'zod';
import { UsersService } from './users.service';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
});

type CreateUserDto = z.infer<typeof CreateUserSchema>;

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list() {
    return this.usersService.findAll();
  }

  @Post()
  async create(@Body() body: unknown) {
    const parsed = CreateUserSchema.parse(body) as CreateUserDto;
    return this.usersService.create({ email: parsed.email, name: parsed.name });
  }
}

