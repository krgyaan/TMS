import { Body, BadRequestException, Controller, Get, HttpCode, HttpStatus, Post, Query, Res, UnauthorizedException } from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { AuthService } from "@/modules/auth/auth.service";
import { Public } from "@/modules/auth/decorators/public.decorator";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";
import { ConfigService } from "@nestjs/config";
import type { AuthConfig } from "@config/auth.config";
import authConfig from "@config/auth.config";
import { AUTH_COOKIE_OPTIONS } from "./auth.cookies";

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const GoogleCallbackSchema = z.object({
    code: z.string().min(1),
    state: z.string().optional(),
});

@Controller("auth")
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService
    ) { }

    @Public()
    @Post("login")
    @HttpCode(HttpStatus.OK)
    async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
        const { email, password } = LoginSchema.parse(body);
        const session = await this.authService.loginWithPassword(email, password);

        this.setAuthCookie(res, session.accessToken);

        return { user: session.user };
    }

    @Get("me")
    async me(@CurrentUser() user: ValidatedUser) {
        if (!user) {
            throw new UnauthorizedException("Not authenticated");
        }
        // Return full user details including role
        return { user: await this.authService.getProfile(user.sub) };
    }

    @Public()
    @Post("logout")
    @HttpCode(HttpStatus.OK)
    logout(@Res({ passthrough: true }) res: Response) {
        res.clearCookie("access_token", AUTH_COOKIE_OPTIONS);
        return { message: "Logged out successfully" };
    }

    @Public()
    @Get("google/url")
    async googleUrl() {
        console.log("google login called!");
        return this.authService.generateGoogleLoginUrl();
    }

    /**
     * GET handler for Google OAuth callback (when Google redirects directly to backend)
     * This sets the auth cookie and redirects to the frontend
     */
    @Public()
    @Get("google/callback")
    async googleCallbackGetOld(@Query() query: Record<string, unknown>, @Res() res: Response) {
        let code: string;
        let state: string | undefined;

        try {
            const parsed = GoogleCallbackSchema.parse(query);
            code = parsed.code;
            state = parsed.state;
        } catch (error) {
            const authCfg = this.configService.get<AuthConfig>(authConfig.KEY);
            const frontendBaseUrl = this.getFrontendBaseUrl(authCfg?.googleRedirect);
            const errorMessage = encodeURIComponent(
                `Invalid OAuth callback parameters. ${error instanceof Error ? error.message : "Missing required fields: code and optional state."}`
            );
            return res.redirect(`${frontendBaseUrl}/auth/google/callback?error=${errorMessage}`);
        }

        try {
            const session = await this.authService.handleGoogleLoginCallback(code, state);

            this.setAuthCookie(res, session.accessToken);

            // Redirect to frontend dashboard (cookie is set, frontend will detect auth)
            const authCfg = this.configService.get<AuthConfig>(authConfig.KEY);
            const frontendBaseUrl = this.getFrontendBaseUrl(authCfg?.googleRedirect);
            return res.redirect(`${frontendBaseUrl}/`);
        } catch (error) {
            // Redirect to frontend callback page with error
            const authCfg = this.configService.get<AuthConfig>(authConfig.KEY);
            const frontendBaseUrl = this.getFrontendBaseUrl(authCfg?.googleRedirect);
            const errorMessage = encodeURIComponent(
                error instanceof BadRequestException ? error.message : `Google OAuth callback failed: ${error instanceof Error ? error.message : "Unknown error occurred"}`
            );
            return res.redirect(`${frontendBaseUrl}/auth/google/callback?error=${errorMessage}`);
        }
    }

    /**
     * Extract base URL from redirect URI (e.g., http://localhost:5173/auth/google/callback -> http://localhost:5173)
     */
    private getFrontendBaseUrl(redirectUri?: string): string {
        if (!redirectUri) {
            return "http://localhost:5173";
        }
        try {
            const url = new URL(redirectUri);
            return `${url.protocol}//${url.host}`;
        } catch {
            return "http://localhost:5173";
        }
    }

    @Public()
    @Post("google/callback")
    @HttpCode(HttpStatus.OK)
    async googleCallbackPost(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
        let code: string;
        let state: string | undefined;

        try {
            const parsed = GoogleCallbackSchema.parse(body);
            code = parsed.code;
            state = parsed.state;
        } catch (error) {
            throw new BadRequestException(
                `Invalid request body for Google OAuth callback. ${error instanceof Error ? error.message : "Missing required fields: code and optional state."}`
            );
        }

        try {
            const session = await this.authService.handleGoogleLoginCallback(code, state);

            this.setAuthCookie(res, session.accessToken);

            return { user: session.user };
        } catch (error) {
            // Re-throw BadRequestException as-is for clearer error messages
            if (error instanceof BadRequestException) {
                throw error;
            }
            // Wrap unexpected errors
            throw new BadRequestException(`Google OAuth callback failed: ${error instanceof Error ? error.message : "Unknown error occurred"}`);
        }
    }

    /**
     * Refresh the current user's session
     * Useful when role/team changes need to be reflected
     */
    @Post("refresh")
    @HttpCode(HttpStatus.OK)
    async refresh(@CurrentUser() user: ValidatedUser, @Res({ passthrough: true }) res: Response) {
        const session = await this.authService.refreshSession(user.sub);

        this.setAuthCookie(res, session.accessToken);

        return { user: session.user };
    }

    private setAuthCookie(res: Response, token: string) {
        const authCfg = this.configService.get<AuthConfig>(authConfig.KEY);
        res.cookie("access_token", token, {
            ...AUTH_COOKIE_OPTIONS,
            maxAge: authCfg?.cookie.maxAge ?? 7 * 24 * 60 * 60 * 1000, // Use config value, default to 7 days
        });
    }
}
