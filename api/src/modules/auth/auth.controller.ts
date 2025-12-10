import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Res,
    UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { AuthService } from '@/modules/auth/auth.service';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const GoogleCallbackSchema = z.object({
    code: z.string().min(1),
    state: z.string().optional(),
});

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() body: unknown,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { email, password } = LoginSchema.parse(body);
        const session = await this.authService.loginWithPassword(email, password);

        this.setAuthCookie(res, session.accessToken);

        return { user: session.user };
    }

    @Get('me')
    async me(@CurrentUser() user: ValidatedUser) {
        if (!user) {
            throw new UnauthorizedException('Not authenticated');
        }
        // Return full user details including role
        return { user: await this.authService.getProfile(user.sub) };
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Res({ passthrough: true }) res: Response) {
        res.clearCookie('access_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        });
        return { message: 'Logged out successfully' };
    }

    @Public()
    @Get('google/url')
    async googleUrl() {
        console.log("google login called!");
        return this.authService.generateGoogleLoginUrl();
    }

    @Public()
    @Post('google/callback')
    @HttpCode(HttpStatus.OK)
    async googleCallback(
        @Body() body: unknown,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { code, state } = GoogleCallbackSchema.parse(body);

        const session = await this.authService.handleGoogleLoginCallback(
            code,
            state,
        );

        this.setAuthCookie(res, session.accessToken);

        return { user: session.user };
    }

    /**
     * Refresh the current user's session
     * Useful when role/team changes need to be reflected
     */
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(
        @CurrentUser() user: ValidatedUser,
        @Res({ passthrough: true }) res: Response,
    ) {
        const session = await this.authService.refreshSession(user.sub);

        this.setAuthCookie(res, session.accessToken);

        return { user: session.user };
    }

    private setAuthCookie(res: Response, token: string) {
        res.cookie('access_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/',
        });
    }
}
