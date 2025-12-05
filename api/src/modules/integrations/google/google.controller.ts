import { Controller, Delete, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { GoogleService } from '@/modules/integrations/google/google.service';

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
}
