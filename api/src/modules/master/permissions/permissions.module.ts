import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { PermissionsController } from '@/modules/master/permissions/permissions.controller';
import { PermissionsService } from '@/modules/master/permissions/permissions.service';

@Module({
    imports: [DatabaseModule],
    controllers: [PermissionsController],
    providers: [PermissionsService],
    exports: [PermissionsService],
})
export class PermissionsModule {}
