import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  type JwtFromRequestFunction,
  type StrategyOptions,
} from 'passport-jwt';
import type { Request } from 'express';
import authConfig, { type AuthConfig } from '../../../config/auth.config';
import { UsersService, type SafeUser } from '../../master/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: JwtStrategy.extractJwtFromRequest(config),
      ignoreExpiration: false,
      secretOrKey: config.jwtAccessSecret,
    } satisfies StrategyOptions);
  }

  // Extract JWT from both cookie and Authorization header (for flexibility)
  private static extractJwtFromRequest(
    config: AuthConfig,
  ): JwtFromRequestFunction {
    return (req: Request): string | null => {
      // 1. Try to get token from httpOnly cookie (preferred)
      if (req.cookies?.[config.cookie.name]) {
        return req.cookies[config.cookie.name];
      }

      // 2. Fallback to Authorization header (for API clients, Postman, etc.)
      const authorization = req.headers?.authorization;
      if (!authorization) {
        return null;
      }

      const [type, token] = authorization.split(' ');
      if (type?.toLowerCase() !== 'bearer' || !token) {
        return null;
      }

      return token;
    };
  }

  async validate(payload: { sub: number; email: string }): Promise<SafeUser> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }
    return this.usersService.sanitizeUser(user);
  }
}
