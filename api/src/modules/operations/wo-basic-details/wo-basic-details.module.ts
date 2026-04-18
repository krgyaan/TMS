import { Module } from '@nestjs/common';
import { WoBasicDetailsController } from './wo-basic-details.controller';
import { WoBasicDetailsService } from './wo-basic-details.service';
import { DatabaseModule } from '@/db/database.module';
import { ProjectsMasterrModule } from '@/modules/shared/projects-master/projects-master.module';

@Module({
    imports: [DatabaseModule, ProjectsMasterrModule],
    controllers: [WoBasicDetailsController],
    providers: [WoBasicDetailsService]
})
export class WoBasicDetailsModule { }
