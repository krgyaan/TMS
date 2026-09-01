import { z } from "zod";
import { randomInt } from "node:crypto";
import { Inject, Injectable, UnauthorizedException, BadRequestException, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { and, eq, gt, desc } from "drizzle-orm";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import authConfig, { type AuthConfig } from "@config/auth.config";
import { UsersService, type UserWithRelations } from "@/modules/master/users/users.service";
import { GoogleService } from "@/modules/integrations/google/google.service";
import { PermissionService } from "@/modules/auth/services/permission.service";
import { DataScope } from "@/common/constants/roles.constant";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { passwordResetOtps } from "@db/schemas";
import type { User } from "@db/schemas/auth/users.schema";
import { MailerService } from "@/mailer/mailer.service";

type SessionWithToken = {
    accessToken: string;
    user: UserWithRelations & { permissions: string[] };
};

export type JwtPayload = {
    id: number;
    sub: number;
    email: string;
    role: string | null;
    roleId: number | null;
    teamId: number | null;
    dataScope: DataScope;
    canSwitchTeams: boolean;
    iat?: number;
    exp?: number;
    permissions : string[];
};

const GoogleLoginStateSchema = z.object({ purpose: z.literal("google-login") });

@Injectable()
export class AuthService {
    constructor(
        @Inject(authConfig.KEY) private readonly config: AuthConfig,
        @Inject(DRIZZLE) private readonly db: DbInstance,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly jwtService: JwtService,
        private readonly usersService: UsersService,
        private readonly googleService: GoogleService,
        private readonly permissionService: PermissionService,
        private readonly mailerService: MailerService
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

        const user = await this.usersService.findByEmail(profile.email);
        if (!user) {
            throw new UnauthorizedException(
                { errorCode: "NO_ACCOUNT_FOUND", email: profile.email },
                "No account found for this Google account. Please register with your details first."
            );
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

        if (!userWithRelations.isActive) {
            throw new UnauthorizedException("Account is inactive");
        }

        const authInfo = await this.usersService.getUserAuthInfo(userId);

        // Get all permissions (role + user overrides)
        const permissions = await this.permissionService.getUserPermissions(userId, authInfo?.roleId ?? null);
        console.log(`[AuthService] issueSession(userId=${userId}) roleId=${authInfo?.roleId} permissions=${permissions.length} [${permissions.slice(0, 10).join(', ')}${permissions.length > 10 ? '...' : ''}]`);

        // Update last login timestamp (fire-and-forget)
        await this.usersService.updateLastLogin(userId);

        const payload: JwtPayload = {
            id: userId,
            sub: userId,
            email: userWithRelations.email,
            role: authInfo?.roleName ?? null,
            roleId: authInfo?.roleId ?? null,
            teamId: authInfo?.primaryTeamId ?? null,
            dataScope: authInfo?.dataScope ?? DataScope.SELF,
            canSwitchTeams: authInfo?.canSwitchTeams ?? false,
            permissions: permissions,
        };

        const accessToken = await this.jwtService.signAsync(payload);

        return {
            accessToken,
            user: { ...userWithRelations, permissions },
        };
    }

    // =====================================================
    // PASSWORD RESET (OTP)
    // =====================================================

    private readonly RESET_OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

    private generateOtp(): string {
        return randomInt(100000, 1000000).toString(); // 6 digits
    }

    async requestPasswordReset(email: string): Promise<{ message: string }> {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new NotFoundException("No account found with this email");
        }

        // Invalidate any previous unused OTPs for this user
        await this.db
            .delete(passwordResetOtps)
            .where(and(eq(passwordResetOtps.userId, user.id), eq(passwordResetOtps.used, false)));

        const otp = this.generateOtp();
        const expiresAt = new Date(Date.now() + this.RESET_OTP_TTL_MS);

        await this.db.insert(passwordResetOtps).values({
            userId: user.id,
            email: user.email,
            otp,
            expiresAt,
        });

        await this.sendResetOtpEmail(user, otp);

        return { message: "OTP sent to your email" };
    }

    private async sendResetOtpEmail(user: User, otp: string): Promise<void> {
        const senderIdStr = process.env.MAIL_SENDER_ID;
        const senderId = senderIdStr ? parseInt(senderIdStr, 10) : NaN;

        const connection = !isNaN(senderId)
            ? await this.googleService.getSanitizedGoogleConnection(senderId)
            : null;

        if (!connection) {
            // No system sender configured — log the OTP so the flow is still testable
            this.logger.warn(`[FORGOT-PASSWORD] No system sender configured (MAIL_SENDER_ID). OTP for ${user.email}: ${otp}`);
            return;
        }

        try {
            await this.mailerService.sendMail(
                {
                    name: "forgot-password",
                    basePath: "modules/auth/mails",
                },
                { name: user.name, otp },
                { to: [user.email], subject: "Reset your TMS password" },
                connection
            );
        } catch (error) {
            this.logger.error("Failed to send password reset OTP email", {
                email: user.email,
                error: error instanceof Error ? error.message : String(error),
            });
            throw new BadRequestException("Failed to send OTP email. Please try again.");
        }
    }

    async verifyOtp(email: string, otp: string): Promise<{ token: string }> {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new BadRequestException("Invalid email or OTP");
        }

        const [record] = await this.db
            .select()
            .from(passwordResetOtps)
            .where(
                and(
                    eq(passwordResetOtps.userId, user.id),
                    eq(passwordResetOtps.otp, otp),
                    eq(passwordResetOtps.used, false),
                    gt(passwordResetOtps.expiresAt, new Date())
                )
            )
            .orderBy(desc(passwordResetOtps.id))
            .limit(1);

        if (!record) {
            throw new BadRequestException("Invalid or expired OTP");
        }

        await this.db.update(passwordResetOtps).set({ used: true }).where(eq(passwordResetOtps.id, record.id));

        const token = await this.jwtService.signAsync(
            { userId: user.id, email: user.email, purpose: "password-reset" },
            { secret: this.config.stateSecret, expiresIn: "5m" }
        );

        return { token };
    }

    async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
        let payload: { userId?: number; purpose?: string };
        try {
            payload = await this.jwtService.verifyAsync(token, { secret: this.config.stateSecret });
        } catch {
            throw new BadRequestException("Invalid or expired reset token");
        }

        if (payload.purpose !== "password-reset" || !payload.userId) {
            throw new BadRequestException("Invalid reset token");
        }

        const user = await this.usersService.findById(payload.userId);
        if (!user) {
            throw new NotFoundException("User not found");
        }

        await this.usersService.update(user.id, { password: newPassword });

        return { message: "Password updated successfully" };
    }

    async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<{ message: string }> {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new NotFoundException("User not found");
        }

        const valid = await this.usersService.verifyPassword(user, currentPassword);
        if (!valid) {
            throw new UnauthorizedException("Current password is incorrect");
        }

        await this.usersService.update(user.id, { password: newPassword });

        return { message: "Password updated successfully" };
    }
}
