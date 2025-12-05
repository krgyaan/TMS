import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
} from '@nestjs/common';
import { z } from 'zod';
import { UserProfilesService } from '@/modules/master/user-profiles/user-profiles.service';

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
    async update(
        @Param('userId', ParseIntPipe) userId: number,
        @Body() body: unknown,
    ) {
        const parsed = UpdateUserProfileSchema.parse(body);
        return this.userProfilesService.updateByUserId(userId, parsed);
    }
}
