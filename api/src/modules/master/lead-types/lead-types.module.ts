import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { LeadTypesController } from './lead-types.controller';
import { LeadTypesService } from './lead-types.service';

@Module({
    imports: [DatabaseModule],
    controllers: [LeadTypesController],
    providers: [LeadTypesService],
    exports: [LeadTypesService],
})
export class LeadTypesModule { }
