// src/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export type CurrentUserType = {
    id: number;
    sub: number;
    email: string;
    role: string | null;
    roleId: number | null;
    teamId: number | null;
    dataScope: string;
    canSwitchTeams: boolean | null;
    isActive: boolean | null;
    permissions: string[];
};

export const CurrentUser = createParamDecorator((data: keyof CurrentUserType | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserType;

    if (data) {
        return user?.[data];
    }
    return user;
});
