import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { ChecklistsController } from './checklists.controller';
import { ChecklistsService } from './checklists.service';

@Module({
    imports: [DatabaseModule],
    controllers: [ChecklistsController],
    providers: [ChecklistsService],
    exports: [ChecklistsService],
})
export class ChecklistsModule { }
