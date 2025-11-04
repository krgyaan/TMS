import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { StatesController } from './states.controller';
import { StatesService } from './states.service';

@Module({
    imports: [DatabaseModule],
    controllers: [StatesController],
    providers: [StatesService],
    exports: [StatesService],
})
export class StatesModule { }
