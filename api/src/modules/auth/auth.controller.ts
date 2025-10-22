import { Buffer } from 'node:buffer';
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
  Inject,
} from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { SafeUser } from '../master/users/users.service';
import authConfig, { type AuthConfig } from '../../config/auth.config';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const GoogleCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1).optional(),
});

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
  ) {}

  @Post('login')
  async login(@Body() body: unknown) {
    const { email, password } = LoginSchema.parse(body);
    return this.authService.loginWithPassword(email, password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: SafeUser) {
    return { user };
  }

  @Get('google/url')
  async googleUrl() {
    return this.authService.generateGoogleLoginUrl();
  }

  @Get('google/callback')
  async googleCallback(
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ) {
    const { code, state } = GoogleCallbackSchema.parse(query);
    try {
      const session = await this.authService.handleGoogleLoginCallback(
        code,
        state,
      );
      const redirect = new URL(this.config.googleRedirect);
      redirect.searchParams.set('status', 'success');
      redirect.searchParams.set('token', session.accessToken);
      redirect.searchParams.set(
        'user',
        Buffer.from(JSON.stringify(session.user)).toString('base64url'),
      );
      return res.redirect(redirect.toString());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Google login failed';
      const redirect = new URL(this.config.googleRedirect);
      redirect.searchParams.set('status', 'error');
      redirect.searchParams.set('error', message);
      return res.redirect(redirect.toString());
    }
  }
}
