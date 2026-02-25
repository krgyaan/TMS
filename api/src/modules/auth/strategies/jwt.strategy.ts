import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, type JwtFromRequestFunction, type StrategyOptions } from "passport-jwt";
import type { Request } from "express";
import authConfig, { type AuthConfig } from "@/config/auth.config";
import { UsersService } from "@/modules/master/users/users.service";
import type { JwtPayload } from "@/modules/auth/auth.service";
import { DataScope } from "@/common/constants/roles.constant";

// What gets attached to request.user
export type ValidatedUser = {
    sub: number;
    email: string;
    role: string | null;
    roleId: number | null;
    teamId: number | null;
    dataScope: DataScope;
    canSwitchTeams: boolean | null;
    isActive: boolean | null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        @Inject(authConfig.KEY) private readonly config: AuthConfig,
        private readonly usersService: UsersService
    ) {
        super({
            jwtFromRequest: JwtStrategy.extractJwtFromRequest(config),
            ignoreExpiration: false,
            secretOrKey: config.jwtAccessSecret,
        } satisfies StrategyOptions);
    }

    private static extractJwtFromRequest(config: AuthConfig): JwtFromRequestFunction {
        return (req: Request): string | null => {
            // 1. Try httpOnly cookie
            if (req.cookies?.[config.cookie.name]) {
                return req.cookies[config.cookie.name];
            }

            // 2. Fallback to Authorization header
            const authorization = req.headers?.authorization;
            if (!authorization) {
                return null;
            }

            const [type, token] = authorization.split(" ");
            if (type?.toLowerCase() !== "bearer" || !token) {
                return null;
            }

            return token;
        };
    }

    async validate(payload: JwtPayload): Promise<ValidatedUser> {
        // Only verify user is still active (minimal DB call)
        const user = await this.usersService.findById(payload.sub);

        if (!user) {
            throw new UnauthorizedException("User not found");
        }

        // Return JWT payload data + active status
        return {
            sub: payload.sub,
            email: payload.email,
            role: payload.role,
            roleId: payload.roleId,
            teamId: payload.teamId,
            dataScope: payload.dataScope ?? DataScope.SELF,
            canSwitchTeams: payload.canSwitchTeams ?? false,
            isActive: user.isActive,
        };
    }
}
