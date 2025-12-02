import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { Request } from "express";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
    constructor(private reflector: Reflector) {
        super();
    }
    canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);

        if (isPublic) {
            return true;
        }

        // Define all public static paths
        const publicStaticPaths = ["/uploads", "/public", "/assets"];

        const request = context.switchToHttp().getRequest<Request>();
        const isStaticPath = publicStaticPaths.some(path => request.path.startsWith(path));

        if (isStaticPath) {
            return true;
        }

        return super.canActivate(context);
    }
}
