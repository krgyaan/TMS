import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { ChecklistsController } from '@/modules/tendering/checklists/checklists.controller';
import { ChecklistsService } from '@/modules/tendering/checklists/checklists.service';

@Module({
    imports: [DatabaseModule],
    controllers: [ChecklistsController],
    providers: [ChecklistsService],
    exports: [ChecklistsService],
})
export class ChecklistsModule { }
