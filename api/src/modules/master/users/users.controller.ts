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
    Patch,
    Post,
} from '@nestjs/common';
import { z } from 'zod';
import { UsersService } from './users.service';

const CreateUserSchema = z.object({
    name: z
        .string()
        .min(1, 'Name is required')
        .max(255, 'Name cannot exceed 255 characters'),
    username: z
        .string()
        .max(100, 'Username cannot exceed 100 characters')
        .optional()
        .nullable(),
    email: z.string().email('Invalid email address'),
    mobile: z.string().max(20, 'Mobile number too long').optional().nullable(),
    password: z
        .string()
        .min(6, 'Password must be at least 6 characters long')
        .max(255),
    isActive: z.boolean().optional(),
});

type CreateUserDto = z.infer<typeof CreateUserSchema>;

const UpdateUserSchema = CreateUserSchema.partial().extend({
    password: z.string().min(6, 'Password must be at least 6 characters long').optional(),
});

type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    async list() {
        return this.usersService.findAll();
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        const user = await this.usersService.findDetailById(id);
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return user;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateUserSchema.parse(body);
        const payload: CreateUserDto = {
            ...parsed,
            name: parsed.name.trim(),
            username: parsed.username?.trim() || null,
            email: parsed.email.trim().toLowerCase(),
            mobile: parsed.mobile?.trim() || null,
            password: parsed.password,
            isActive: parsed.isActive ?? true,
        };
        return this.usersService.create(payload);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
    ) {
        const parsed = UpdateUserSchema.parse(body);
        const payload: UpdateUserDto = {
            ...parsed,
            name: parsed.name?.trim(),
            username:
                parsed.username === undefined
                    ? parsed.username
                    : parsed.username?.trim() || null,
            email: parsed.email?.trim().toLowerCase(),
            mobile:
                parsed.mobile === undefined
                    ? parsed.mobile
                    : parsed.mobile?.trim() || null,
        };
        return this.usersService.update(id, payload);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.usersService.delete(id);
    }
}
