// src/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from "@nestjs/common";

// Define the shape of your user object
export type CurrentUserType = {
    id: number;
    name: string;
    email: string;
    username: string | null;
    mobile: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
};

export const CurrentUser = createParamDecorator((data: keyof CurrentUserType | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserType;

    if (data) {
        return user?.[data];
    }
    return user;
});
