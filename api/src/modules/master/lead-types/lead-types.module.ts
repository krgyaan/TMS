import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { LeadTypesController } from '@/modules/master/lead-types/lead-types.controller';
import { LeadTypesService } from '@/modules/master/lead-types/lead-types.service';

@Module({
    imports: [DatabaseModule],
    controllers: [LeadTypesController],
    providers: [LeadTypesService],
    exports: [LeadTypesService],
})
export class LeadTypesModule { }
