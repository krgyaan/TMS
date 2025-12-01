import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Res
} from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtPayload } from './auth.service';

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
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

        // Set httpOnly cookie
        res.cookie('access_token', session.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return { user: session.user };
    }

    @Get('me')
    async me(@CurrentUser() user: JwtPayload) {
        // Return full user details including role
        return { user: await this.authService.getProfile(user.sub) };
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Res({ passthrough: true }) res: Response) {
        res.clearCookie('access_token');
        return { message: 'Logged out successfully' };
    }

    @Public()
    @Get('google/url')
    async googleUrl() {
        return this.authService.generateGoogleLoginUrl();
    }

    @Public()
    @Post('google/callback')
    @HttpCode(HttpStatus.OK)
    async googleCallback(
        @Body() body: { code: string; state?: string },
        @Res({ passthrough: true }) res: Response,
    ) {
        const session = await this.authService.handleGoogleLoginCallback(
            body.code,
            body.state,
        );

        res.cookie('access_token', session.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return { user: session.user };
    }
}
