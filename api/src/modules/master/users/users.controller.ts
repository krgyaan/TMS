import { RoleName, hasMinimumRole } from "@/common/constants/roles.constant";
import { Public } from "@/modules/auth/decorators";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { CanDelete, CanRead, CanUpdate } from "@/modules/auth/decorators/permissions.decorator";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";
import { UsersService } from "@/modules/master/users/users.service";
import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { z } from "zod";

const CreateUserSchema = z.object({
    firstName: z.string().min(1, "First name is required").max(255),
    lastName: z.string().min(1, "Last name is required").max(255),
    email: z.string().email("Invalid email address"),
    username: z.string().max(100, "Username cannot exceed 100 characters").optional().nullable(),
    mobile: z.string().max(20, "Mobile number too long").optional().nullable(),
    password: z.string().min(6, "Password must be at least 6 characters long").max(255),
    teamId: z.number().int().positive("Team is required"),
    subTeamId: z.number().int().positive().optional().nullable(),
    roleId: z.number().int().positive("Role is required"),
    isActive: z.boolean().optional(),
});

type CreateUserDto = z.infer<typeof CreateUserSchema>;

const UpdateUserSchema = z.object({
    name: z.string().min(1, "Name is required").max(255, "Name cannot exceed 255 characters").optional(),
    username: z.string().max(100, "Username cannot exceed 100 characters").optional().nullable(),
    email: z.string().email("Invalid email address").optional(),
    mobile: z.string().max(20, "Mobile number too long").optional().nullable(),
    password: z.string().min(6, "Password must be at least 6 characters long").max(255).optional(),
    roleId: z.number().int().positive("Role ID must be a positive integer").optional(),
    isActive: z.boolean().optional(),
});

type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

@Controller("users")
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    @CanRead("users")
    async list() {
        return this.usersService.findAll();
    }

    @Public()
    @Get("generate-info")
    async getGenerateInfo(@Query("email") email?: string) {
        const employeeCode = await this.usersService.generateEmployeeCode();
        let username = "";
        if (email) {
            const prefix = email.split("@")[0];
            if (prefix) {
                const existing = await this.usersService.findByUsername(prefix);
                if (existing) {
                    username = `${prefix}_${prefix[0]}_ve`;
                } else {
                    username = prefix;
                }
            }
        }
        return { employeeCode, username };
    }

    @Public()
    @Get("by-role/:roleId")
    async getUsersByRole(@Param("roleId") roleId: number) {
        return this.usersService.findUsersByRole(roleId);
    }

    @Get('of-ops')
    async getUsersOfOps(@Query('team') team?: string) {
        // If team is "undefined", "null", or empty string, treat as undefined
        const isInvalid = !team || team === 'undefined' || team === 'null';
        const teamId = isInvalid ? undefined : parseInt(team, 10);

        // Final sanity check: if the string was something like "abc", parseInt returns NaN
        return this.usersService.findUsersOfOps(isNaN(teamId!) ? undefined : teamId);
    }

    @Get(":id")
    @CanRead("users")
    async getById(@Param("id", ParseIntPipe) id: number) {
        const user = await this.usersService.findDetailById(id);
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return user;
    }

    @Public()
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateUserSchema.parse(body);
        const user = await this.usersService.createWithDetails({
            firstName: parsed.firstName.trim(),
            lastName: parsed.lastName.trim(),
            email: parsed.email.trim().toLowerCase(),
            username: parsed.username?.trim() || null,
            mobile: parsed.mobile?.trim() || null,
            password: parsed.password,
            teamId: parsed.teamId,
            subTeamId: parsed.subTeamId ?? null,
            roleId: parsed.roleId,
            isActive: parsed.isActive ?? true,
        });
        return this.usersService.findDetailById(user.id);
    }

    @Patch(":id")
    // @CanUpdate("users")
    async update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown, @CurrentUser() currentUser: ValidatedUser) {
        const parsed = UpdateUserSchema.parse(body);

        // Check if user is trying to update email
        if (parsed.email !== undefined) {
            // Only Admin/Super User/Coordinator can update email
            const canUpdateEmail = hasMinimumRole(currentUser.role ?? "", RoleName.COORDINATOR);

            // If user is updating their own email, check permission
            if (currentUser.sub === id && !canUpdateEmail) {
                throw new ForbiddenException("You cannot update your own email address");
            }

            // If user is updating someone else's email, check permission
            if (currentUser.sub !== id && !canUpdateEmail) {
                throw new ForbiddenException("You do not have permission to update email addresses");
            }
        }

        const payload: UpdateUserDto = {
            ...parsed,
            name: parsed.name?.trim(),
            username: parsed.username === undefined ? parsed.username : parsed.username?.trim() || null,
            email: parsed.email?.trim().toLowerCase(),
            mobile: parsed.mobile === undefined ? parsed.mobile : parsed.mobile?.trim() || null,
        };
        return this.usersService.update(id, payload);
    }

    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    @CanDelete("users")
    async delete(@Param("id", ParseIntPipe) id: number, @CurrentUser() currentUser: ValidatedUser) {
        await this.usersService.delete(id, currentUser.sub);
    }

    // User Activation/Deactivation
    @Patch(":id/activate")
    @HttpCode(HttpStatus.OK)
    @CanUpdate("users")
    async activate(@Param("id", ParseIntPipe) id: number, @CurrentUser() currentUser: ValidatedUser) {
        // Check if user has coordinator+ role
        const canActivate = hasMinimumRole(currentUser.role ?? "", RoleName.COORDINATOR);

        if (!canActivate) {
            throw new ForbiddenException("You do not have permission to activate users");
        }

        await this.usersService.activate(id);
        return { message: "User activated successfully" };
    }

    @Patch(":id/deactivate")
    @HttpCode(HttpStatus.OK)
    @CanUpdate("users")
    async deactivate(@Param("id", ParseIntPipe) id: number, @CurrentUser() currentUser: ValidatedUser) {
        // Check if user has coordinator+ role
        const canDeactivate = hasMinimumRole(currentUser.role ?? "", RoleName.COORDINATOR);

        if (!canDeactivate) {
            throw new ForbiddenException("You do not have permission to deactivate users");
        }

        await this.usersService.deactivate(id);
        return { message: "User deactivated successfully" };
    }

    // User Roles Management
    @Post(":id/roles")
    @HttpCode(HttpStatus.CREATED)
    @CanUpdate("users")
    async assignRole(@Param("id", ParseIntPipe) userId: number, @Body() body: unknown) {
        const schema = z.object({
            roleId: z.number().int().positive("Role ID must be a positive integer"),
        });
        const parsed = schema.parse(body);
        await this.usersService.assignRole(userId, parsed.roleId);
        return { message: "Role assigned successfully" };
    }

    @Get(":id/roles")
    @CanRead("users")
    async getUserRole(@Param("id", ParseIntPipe) userId: number) {
        const role = await this.usersService.getUserRole(userId);
        return role;
    }

    @Patch(":id/roles")
    @CanUpdate("users")
    async updateUserRole(@Param("id", ParseIntPipe) userId: number, @Body() body: unknown) {
        const schema = z.object({
            roleId: z.number().int().positive("Role ID must be a positive integer"),
        });
        const parsed = schema.parse(body);
        await this.usersService.assignRole(userId, parsed.roleId);
        return { message: "Role updated successfully" };
    }

    // User Permissions Management
    @Post(":id/permissions")
    @HttpCode(HttpStatus.CREATED)
    @CanUpdate("users")
    async assignPermissions(@Param("id", ParseIntPipe) userId: number, @Body() body: unknown) {
        const schema = z.object({
            permissions: z.array(
                z.object({
                    permissionId: z.number().int().positive(),
                    granted: z.boolean().default(true),
                })
            ),
        });
        const parsed = schema.parse(body);
        await this.usersService.assignPermissions(
            userId,
            parsed.permissions.map(p => p.permissionId),
            parsed.permissions.map(p => p.granted)
        );
        return { message: "Permissions assigned successfully" };
    }

    @Get(":id/permissions")
    @CanRead("users")
    async getUserPermissions(@Param("id", ParseIntPipe) userId: number) {
        const permissions = await this.usersService.getUserPermissions(userId);
        return permissions;
    }

    @Patch(":id/permissions")
    @CanUpdate("users")
    async updateUserPermissions(@Param("id", ParseIntPipe) userId: number, @Body() body: unknown) {
        const schema = z.object({
            permissions: z.array(
                z.object({
                    permissionId: z.number().int().positive(),
                    granted: z.boolean().default(true),
                })
            ),
        });
        const parsed = schema.parse(body);
        await this.usersService.assignPermissions(
            userId,
            parsed.permissions.map(p => p.permissionId),
            parsed.permissions.map(p => p.granted)
        );
        return { message: "Permissions updated successfully" };
    }

    @Delete(":id/permissions/:permissionId")
    @HttpCode(HttpStatus.NO_CONTENT)
    @CanUpdate("users")
    async removeUserPermission(@Param("id", ParseIntPipe) userId: number, @Param("permissionId", ParseIntPipe) permissionId: number) {
        await this.usersService.removeUserPermission(userId, permissionId);
    }

    @Get("team/:teamId/members")
    @CanRead("users")
    async getTeamMembers(@Param("teamId", ParseIntPipe) teamId: number) {
        const members = await this.usersService.getTeamMembers(teamId);
        return members;
    }
}
