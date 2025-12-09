import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { RolesController } from '@/modules/master/roles/roles.controller';
import { RolesService } from '@/modules/master/roles/roles.service';

@Module({
    imports: [DatabaseModule],
    controllers: [RolesController],
    providers: [RolesService],
    exports: [RolesService],
})
export class RolesModule { }
