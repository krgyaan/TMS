import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
    imports: [DatabaseModule],
    controllers: [LeadsController],
    providers: [LeadsService],
    exports: [LeadsService],
})
export class LeadsModule {}