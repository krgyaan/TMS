import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    UseGuards,
    BadRequestException,
} from '@nestjs/common';
import { z } from 'zod';
import { UserProfilesService } from '@/modules/master/user-profiles/user-profiles.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ProfileEditGuard } from './guards/profile-edit.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

const CreateUserProfileSchema = z.object({
    userId: z.number(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    employeeCode: z.string().optional(),
    designationId: z.number().optional(),
    primaryTeamId: z.number().optional(),
    altEmail: z.string().email().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    image: z.string().optional(),
    signature: z.string().optional(),
    dateOfJoining: z.string().optional(),
    dateOfExit: z.string().optional(),
    timezone: z.string().optional(),
    locale: z.string().optional(),
});

type CreateUserProfileDto = z.infer<typeof CreateUserProfileSchema>;

const UpdateUserProfileSchema = CreateUserProfileSchema.partial().omit({
    userId: true,
});

type UpdateUserProfileDto = z.infer<typeof UpdateUserProfileSchema>;

@Controller('user-profiles')
@UseGuards(JwtAuthGuard)
export class UserProfilesController {
    constructor(private readonly userProfilesService: UserProfilesService) { }

    @Get()
    async list() {
        return this.userProfilesService.findAll();
    }

    @Post()
    async create(@Body() body: unknown) {
        const parsed = CreateUserProfileSchema.parse(body);
        return this.userProfilesService.create(parsed);
    }

    @Get(':userId')
    async getByUser(@Param('userId', ParseIntPipe) userId: number) {
        return this.userProfilesService.findByUserId(userId);
    }

    @Patch(':userId')
    @UseGuards(ProfileEditGuard)
    async update(
        @Param('userId', ParseIntPipe) userId: number,
        @Body() body: unknown,
        @CurrentUser() currentUser: ValidatedUser,
    ) {
        const parsed = UpdateUserProfileSchema.parse(body);
        return this.userProfilesService.updateByUserId(userId, parsed);
    }

    @Post(':userId/avatar')
    @UseGuards(ProfileEditGuard)
    async uploadAvatar(
        @Param('userId', ParseIntPipe) userId: number,
        @Body() body: unknown,
    ) {
        const schema = z.object({
            image: z.string().min(1, 'Image path is required'),
        });
        const parsed = schema.parse(body);

        if (!parsed.image) {
            throw new BadRequestException('Image path is required');
        }

        await this.userProfilesService.updateAvatar(userId, parsed.image);
        return { message: 'Avatar updated successfully', path: parsed.image };
    }
}
