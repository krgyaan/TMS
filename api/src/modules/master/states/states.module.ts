import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { StatesController } from '@/modules/master/states/states.controller';
import { StatesService } from '@/modules/master/states/states.service';

@Module({
    imports: [DatabaseModule],
    controllers: [StatesController],
    providers: [StatesService],
    exports: [StatesService],
})
export class StatesModule { }
