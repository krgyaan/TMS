import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { LeadIndustriesController } from './lead-industries.controller';
import { LeadIndustriesService } from './lead-industries.service';

@Module({
    imports: [DatabaseModule],
    controllers: [LeadIndustriesController],
    providers: [LeadIndustriesService],
    exports: [LeadIndustriesService],
})
export class LeadIndustriesModule {}