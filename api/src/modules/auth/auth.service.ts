import { z } from 'zod';
import {
  Inject,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import authConfig, { type AuthConfig } from '../../config/auth.config';
import { UsersService, type SafeUser } from '../master/users/users.service';
import { GoogleService } from '../integrations/google/google.service';

type AuthSession = {
  accessToken: string;
  user: SafeUser;
};

const GoogleLoginStateSchema = z.object({ purpose: z.literal('google-login') });

@Injectable()
export class AuthService {
  constructor(
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly googleService: GoogleService,
  ) {}

  async loginWithPassword(
    email: string,
    password: string,
  ): Promise<AuthSession> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await this.usersService.verifyPassword(user, password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }
    return this.issueSession(user.id);
  }

  async getProfile(userId: number): Promise<SafeUser> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.usersService.sanitizeUser(user);
  }

  async generateGoogleLoginUrl(): Promise<{ url: string }> {
    const state = await this.jwtService.signAsync(
      { purpose: 'google-login' },
      { secret: this.config.stateSecret, expiresIn: '5m' },
    );
    return this.googleService.createAuthUrlWithState(state);
  }

  async handleGoogleLoginCallback(
    code: string,
    state?: string,
  ): Promise<AuthSession> {
    if (!state) {
      throw new BadRequestException('Missing OAuth state parameter');
    }

    try {
      GoogleLoginStateSchema.parse(
        await this.jwtService.verifyAsync(state, {
          secret: this.config.stateSecret,
        }),
      );
    } catch {
      throw new BadRequestException('Google login state verification failed');
    }

    const exchangeResult = await this.googleService.exchangeCode(code);
    const tokens = exchangeResult.tokens;
    const profile = exchangeResult.profile;

    if (!profile.email) {
      throw new BadRequestException(
        'Google account does not expose an email address',
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

  private async issueSession(userId: number): Promise<AuthSession> {
    const user = await this.usersService.ensureUser(userId);
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);
    const safeUser = this.usersService.sanitizeUser(user);
    return { accessToken, user: safeUser };
  }
}
