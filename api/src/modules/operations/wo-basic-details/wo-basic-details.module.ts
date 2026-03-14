import { Module } from '@nestjs/common';
import { WoBasicDetailsController } from './wo-basic-details.controller';
import { WoBasicDetailsService } from './wo-basic-details.service';
import { DatabaseModule } from '@/db/database.module';

@Module({
    imports: [DatabaseModule],
    controllers: [WoBasicDetailsController],
    providers: [WoBasicDetailsService]
})
export class WoBasicDetailsModule {}
