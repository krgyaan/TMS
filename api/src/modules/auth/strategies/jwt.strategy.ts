/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
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

const extractJwtFromRequest: JwtFromRequestFunction = (req: Request) => {
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

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(authConfig.KEY) config: AuthConfig,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: extractJwtFromRequest,
      ignoreExpiration: false,
      secretOrKey: config.jwtAccessSecret,
    } satisfies StrategyOptions);
  }

  async validate(payload: { sub: number; email: string }): Promise<SafeUser> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }
    return this.usersService.sanitizeUser(user);
  }
}
