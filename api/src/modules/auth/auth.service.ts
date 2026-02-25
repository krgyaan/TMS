import { z } from "zod";
import { Inject, Injectable, UnauthorizedException, BadRequestException, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import authConfig, { type AuthConfig } from "@config/auth.config";
import { UsersService, type UserWithRelations } from "@/modules/master/users/users.service";
import { GoogleService } from "@/modules/integrations/google/google.service";
import { PermissionService } from "@/modules/auth/services/permission.service";
import { DataScope } from "@/common/constants/roles.constant";

type SessionWithToken = {
    accessToken: string;
    user: UserWithRelations & { permissions: string[] };
};

export type JwtPayload = {
    sub: number;
    id: number;
    email: string;
    role: string | null;
    roleId: number | null;
    teamId: number | null;
    dataScope: DataScope;
    canSwitchTeams: boolean;
    iat?: number;
    exp?: number;
};

const GoogleLoginStateSchema = z.object({ purpose: z.literal("google-login") });

@Injectable()
export class AuthService {
    constructor(
        @Inject(authConfig.KEY) private readonly config: AuthConfig,
        private readonly jwtService: JwtService,
        private readonly usersService: UsersService,
        private readonly googleService: GoogleService,
        private readonly permissionService: PermissionService
    ) {}

    async loginWithPassword(email: string, password: string): Promise<SessionWithToken> {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException("Invalid credentials");
        }

        const valid = await this.usersService.verifyPassword(user, password);
        if (!valid) {
            throw new UnauthorizedException("Invalid credentials");
        }

        if (!user.isActive) {
            throw new UnauthorizedException("Account is inactive");
        }

        return this.issueSession(user.id);
    }

    async getProfile(userId: number): Promise<UserWithRelations & { permissions: string[] }> {
        const user = await this.usersService.findDetailById(userId);
        if (!user) {
            throw new UnauthorizedException("User not found");
        }

        const permissions = await this.permissionService.getUserPermissions(userId, user.role?.id ?? null);

        return { ...user, permissions };
    }

    async getPermissionsWithId(id: number): Promise<UserWithRelations & { permissions: string[] }> {
        const user = await this.usersService.findDetailById(id);
        console.log("User fetched in getPermissionsWithId:", user);

        if (!user) {
            throw new NotFoundException("User not found");
        }

        const permissions = await this.permissionService.getUserPermissionsWithId(id);

        return { ...user, permissions };
    }

    async generateGoogleLoginUrl(): Promise<{ url: string }> {
        // Validate redirect URI format
        try {
            new URL(this.config.googleRedirect);
        } catch {
            throw new BadRequestException(`Invalid redirect URI format: ${this.config.googleRedirect}. Must be a valid URL.`);
        }

        const state = await this.jwtService.signAsync({ purpose: "google-login" }, { secret: this.config.stateSecret, expiresIn: "5m" });
        return this.googleService.createAuthUrlWithState(state, this.config.googleRedirect);
    }

    async handleGoogleLoginCallback(code: string, state?: string): Promise<SessionWithToken> {
        if (!state) {
            throw new BadRequestException("Missing OAuth state parameter. The Google OAuth callback must include a state parameter.");
        }

        if (!code || code.trim().length === 0) {
            throw new BadRequestException("Missing or empty authorization code from Google OAuth callback.");
        }

        // Validate redirect URI format
        try {
            new URL(this.config.googleRedirect);
        } catch {
            throw new BadRequestException(`Invalid redirect URI configuration: ${this.config.googleRedirect}. Please check AUTH_GOOGLE_REDIRECT environment variable.`);
        }

        let verifiedState;
        try {
            verifiedState = await this.jwtService.verifyAsync(state, {
                secret: this.config.stateSecret,
            });
            GoogleLoginStateSchema.parse(verifiedState);
        } catch (error) {
            if (error instanceof Error && error.name === "TokenExpiredError") {
                throw new BadRequestException("Google login state has expired. Please try logging in again.");
            }
            throw new BadRequestException("Google login state verification failed. The state parameter may be invalid or tampered with.");
        }

        let exchangeResult;
        try {
            exchangeResult = await this.googleService.exchangeCode(code, this.config.googleRedirect);
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(
                `Failed to exchange Google authorization code for tokens: ${error instanceof Error ? error.message : "Unknown error"}. Please ensure the redirect URI matches Google OAuth configuration.`
            );
        }

        const tokens = exchangeResult.tokens;
        const profile = exchangeResult.profile;

        if (!profile.email) {
            throw new BadRequestException(
                "Google account does not expose an email address. Please ensure your Google account has an email address and grants permission to share it."
            );
        }

        let user = await this.usersService.findByEmail(profile.email);
        if (!user) {
            user = await this.usersService.createFromGoogle({
                email: profile.email,
                name: profile.name,
            });
        }

        await this.googleService.upsertConnection(user.id, tokens, profile);

        return this.issueSession(user.id);
    }

    async refreshSession(userId: number): Promise<SessionWithToken> {
        return this.issueSession(userId);
    }

    private async issueSession(userId: number): Promise<SessionWithToken> {
        const userWithRelations = await this.usersService.findDetailById(userId);
        if (!userWithRelations) {
            throw new UnauthorizedException("User not found");
        }

        const authInfo = await this.usersService.getUserAuthInfo(userId);

        const payload: JwtPayload = {
            sub: userId,
            id: userId,
            email: userWithRelations.email,
            role: authInfo?.roleName ?? null,
            roleId: authInfo?.roleId ?? null,
            teamId: authInfo?.primaryTeamId ?? null,
            dataScope: authInfo?.dataScope ?? DataScope.SELF,
            canSwitchTeams: authInfo?.canSwitchTeams ?? false,
        };

        const accessToken = await this.jwtService.signAsync(payload);

        // Get permissions for frontend
        const permissions = await this.permissionService.getUserPermissions(userId, authInfo?.roleId ?? null);

        return {
            accessToken,
            user: { ...userWithRelations, permissions },
        };
    }
}
