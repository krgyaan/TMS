import { Controller, Delete, Get, Param, Query, Res, UseGuards, Post } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { GoogleService } from '@/modules/integrations/google/google.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { RequirePermissions } from '@/modules/auth/decorators/permissions.decorator';
import { DRIVE_SCOPES } from '@/config/google.config';

const AuthUrlQuerySchema = z.object({
    userId: z.coerce.number().int().positive(),
});

const CallbackQuerySchema = z.object({
    code: z.string().min(1),
    state: z.string().min(1).optional(),
});

const ConnectionsQuerySchema = z.object({
    userId: z.coerce.number().int().positive(),
});

const DisconnectParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

const DisconnectQuerySchema = z.object({
    userId: z.coerce.number().int().positive(),
});

@Controller('integrations/google')
export class GoogleController {
    constructor(private readonly googleService: GoogleService) { }

    @Get('auth-url')
    getAuthUrl(@Query() query: Record<string, unknown>) {
        const { userId } = AuthUrlQuerySchema.parse(query);
        return this.googleService.createAuthUrl(userId);
    }

    @Get('callback')
    async handleCallback(
        @Query() query: Record<string, unknown>,
        @Res({ passthrough: true }) res: Response,
    ) {
        const parsed = CallbackQuerySchema.parse(query);
        try {
            const connection = await this.googleService.handleOAuthCallback(parsed);
            const redirectUrl = this.googleService.buildRedirectUrl('success', {
                userId: connection.userId,
                connectionId: connection.id,
            });
            res.redirect(redirectUrl);
            return { status: 'success' };
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Unable to connect Google account';
            const redirectUrl = this.googleService.buildRedirectUrl('error', {
                error: message,
            });
            res.redirect(redirectUrl);
            return { status: 'error', message };
        }
    }

    @Get('connections')
    async listConnections(@Query() query: Record<string, unknown>) {
        const { userId } = ConnectionsQuerySchema.parse(query);
        const connections = await this.googleService.listConnections(userId);
        return { connections };
    }

    @Get('drive-auth-url')
    @UseGuards(JwtAuthGuard)
    async getDriveAuthUrl(@CurrentUser() user: ValidatedUser) {
        // Check if user already has drive scopes
        const scopeCheck = await this.googleService.checkUserScopes(
            user.sub,
            DRIVE_SCOPES,
        );

        if (scopeCheck.hasAllScopes) {
            return {
                hasScopes: true,
                message: 'User already has Drive permissions',
            };
        }

        const { url } = this.googleService.createDriveScopeAuthUrl(user.sub);
        return {
            hasScopes: false,
            url,
            missingScopes: scopeCheck.missingScopes,
        };
    }

    @Get('check-drive-scopes')
    @UseGuards(JwtAuthGuard)
    async checkDriveScopes(@CurrentUser() user: ValidatedUser) {
        const scopeCheck = await this.googleService.checkUserScopes(
            user.sub,
            DRIVE_SCOPES,
        );

        return {
            hasScopes: scopeCheck.hasAllScopes,
            grantedScopes: scopeCheck.grantedScopes,
            missingScopes: scopeCheck.missingScopes,
        };
    }

    @Delete('connections/:id')
    async disconnect(
        @Param() params: Record<string, unknown>,
        @Query() query: Record<string, unknown>,
    ) {
        const { id } = DisconnectParamsSchema.parse(params);
        const { userId } = DisconnectQuerySchema.parse(query);
        await this.googleService.disconnect(userId, id);
        return { success: true };
    }

    // Account Linking Endpoints (for authenticated users)
    @Get('accounts/auth-url')
    @UseGuards(JwtAuthGuard)
    @RequirePermissions({ module: 'integrations', action: 'create' })
    async getAccountLinkUrl(@CurrentUser() user: ValidatedUser) {
        const url = await this.googleService.createAuthUrl(user.sub);
        return { url: url.url };
    }

    @Get('accounts/callback')
    @UseGuards(JwtAuthGuard)
    async handleAccountLinkCallback(
        @Query() query: Record<string, unknown>,
        @Res({ passthrough: true }) res: Response,
        @CurrentUser() user: ValidatedUser,
    ) {
        const parsed = CallbackQuerySchema.parse(query);
        try {
            const connection = await this.googleService.handleAccountLinkCallback(
                parsed.code,
                parsed.state || '',
                user.sub,
            );
            const redirectUrl = this.googleService.buildRedirectUrl('success', {
                userId: connection.userId,
                connectionId: connection.id,
            });
            res.redirect(redirectUrl);
            return { status: 'success' };
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Unable to link Google account';
            const redirectUrl = this.googleService.buildRedirectUrl('error', {
                error: message,
            });
            res.redirect(redirectUrl);
            return { status: 'error', message };
        }
    }

    @Get('accounts')
    @UseGuards(JwtAuthGuard)
    async listUserConnections(@CurrentUser() user: ValidatedUser) {
        const connections = await this.googleService.listConnections(user.sub);
        return { connections };
    }

    @Delete('accounts/:id')
    @UseGuards(JwtAuthGuard)
    @RequirePermissions({ module: 'integrations', action: 'delete' })
    async unlinkAccount(
        @Param() params: Record<string, unknown>,
        @CurrentUser() user: ValidatedUser,
    ) {
        const { id } = DisconnectParamsSchema.parse(params);
        await this.googleService.disconnect(user.sub, id);
        return { success: true };
    }
}
