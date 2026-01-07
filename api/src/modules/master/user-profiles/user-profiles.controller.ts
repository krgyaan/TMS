import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards, BadRequestException } from "@nestjs/common";
import { z } from "zod";
import { UserProfilesService } from "@/modules/master/user-profiles/user-profiles.service";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { ProfileEditGuard } from "./guards/profile-edit.guard";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";

function toDateString(date?: Date | null): string | null {
    return date ? date.toISOString().split("T")[0] : null;
}

const CreateUserProfileSchema = z.object({
    userId: z.number(),

    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),

    dateOfBirth: z.coerce.date().nullable().optional(),
    gender: z.string().nullable().optional(),

    employeeCode: z.string().nullable().optional(),

    designationId: z.number().nullable().optional(),
    primaryTeamId: z.number().nullable().optional(),

    altEmail: z.string().email().nullable().optional(),

    emergencyContactName: z.string().nullable().optional(),
    emergencyContactPhone: z.string().nullable().optional(),

    image: z.string().nullable().optional(),
    signature: z.string().nullable().optional(),

    dateOfJoining: z.coerce.date().nullable().optional(),
    dateOfExit: z.coerce.date().nullable().optional(),

    timezone: z.string().optional(), // DB default handles it
    locale: z.string().optional(), // DB default handles it
});

type CreateUserProfileDto = z.infer<typeof CreateUserProfileSchema>;

const UpdateUserProfileSchema = CreateUserProfileSchema.partial().omit({
    userId: true,
});

type UpdateUserProfileDto = z.infer<typeof UpdateUserProfileSchema>;

@Controller("user-profiles")
@UseGuards(JwtAuthGuard)
export class UserProfilesController {
    constructor(private readonly userProfilesService: UserProfilesService) {}

    @Get()
    async list() {
        return this.userProfilesService.findAll();
    }

    @Post()
    async create(@Body() body: unknown) {
        console.log("Received request to create user profile with body:", body);
        const parsed = CreateUserProfileSchema.parse(body);
        const cleanParsed = {
            ...parsed,
            dateOfBirth: toDateString(parsed.dateOfBirth),
            dateOfJoining: toDateString(parsed.dateOfJoining),
            dateOfExit: toDateString(parsed.dateOfExit),
        };

        return this.userProfilesService.create(cleanParsed);
    }

    @Get(":userId")
    async getByUser(@Param("userId", ParseIntPipe) userId: number) {
        return this.userProfilesService.findByUserId(userId);
    }

    @Patch(":userId")
    @UseGuards(ProfileEditGuard)
    async update(@Param("userId", ParseIntPipe) userId: number, @Body() body: unknown, @CurrentUser() currentUser: ValidatedUser) {
        const parsed = UpdateUserProfileSchema.parse(body);
        const cleanParsed = {
            ...parsed,
            dateOfBirth: toDateString(parsed.dateOfBirth),
            dateOfJoining: toDateString(parsed.dateOfJoining),
            dateOfExit: toDateString(parsed.dateOfExit),
        };

        return this.userProfilesService.updateByUserId(userId, cleanParsed);
    }

    @Post(":userId/avatar")
    @UseGuards(ProfileEditGuard)
    async uploadAvatar(@Param("userId", ParseIntPipe) userId: number, @Body() body: unknown) {
        const schema = z.object({
            image: z.string().min(1, "Image path is required"),
        });
        const parsed = schema.parse(body);

        if (!parsed.image) {
            throw new BadRequestException("Image path is required");
        }

        await this.userProfilesService.updateAvatar(userId, parsed.image);
        return { message: "Avatar updated successfully", path: parsed.image };
    }
}
