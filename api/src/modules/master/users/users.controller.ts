import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseIntPipe, Patch, Post, UseGuards, ForbiddenException } from "@nestjs/common";
import { z } from "zod";
import { UsersService } from "@/modules/master/users/users.service";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { RequirePermissions, CanCreate, CanRead, CanUpdate, CanDelete } from "@/modules/auth/decorators/permissions.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";
import { RoleName, hasMinimumRole } from "@/common/constants/roles.constant";
import { Public } from "@/modules/auth/decorators";

const CreateUserSchema = z.object({
    name: z.string().min(1, "Name is required").max(255, "Name cannot exceed 255 characters"),
    username: z.string().max(100, "Username cannot exceed 100 characters").optional().nullable(),
    email: z.string().email("Invalid email address"),
    mobile: z.string().max(20, "Mobile number too long").optional().nullable(),
    password: z.string().min(6, "Password must be at least 6 characters long").max(255),
    isActive: z.boolean().optional(),
    roleId: z.number().int().positive("Role ID must be a positive integer"),
});

type CreateUserDto = z.infer<typeof CreateUserSchema>;

const UpdateUserSchema = CreateUserSchema.partial().extend({
    password: z.string().min(6, "Password must be at least 6 characters long").optional(),
});

type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    @CanRead("users")
    async list() {
        return this.usersService.findAll();
    }

    @Public()
    @Get("by-role/:roleId")
    async getUsersByRole(@Param("roleId") roleId: number) {
        return this.usersService.findUsersByRole(roleId);
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
    // @HttpCode(HttpStatus.CREATED)
    // @CanCreate("users")
    async create(@Body() body: unknown) {
        console.log("Creating user with payload:", body);
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
        const user = await this.usersService.create(payload);
        // Auto-assign role after user creation
        await this.usersService.assignRole(user.id, parsed.roleId);
        return user;
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
