import { Module } from '@nestjs/common';
import { WoDetailsController } from './wo-details.controller';
import { WoDetailsService } from './wo-details.service';
import { DatabaseModule } from '@/db/database.module';

@Module({
    imports: [DatabaseModule],
    controllers: [WoDetailsController],
    providers: [WoDetailsService],
    exports: [WoDetailsService],
})
export class WoDetailsModule {}
