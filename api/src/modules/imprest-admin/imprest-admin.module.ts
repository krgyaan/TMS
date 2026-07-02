import { Module } from "@nestjs/common";
import { ImprestAdminController } from "./imprest-admin.controller";
import { ImprestAdminService } from "./imprest-admin.service";
import { PermissionService } from "../auth/services/permission.service";

@Module({
    controllers: [ImprestAdminController],
    providers: [ImprestAdminService, PermissionService],
})
export class ImprestAdminModule {}
