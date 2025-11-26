import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { TendersModule } from '../tenders/tenders.module';
import { EmdsController } from './emds.controller';
import { EmdsService } from './emds.service';

@Module({
    imports: [DatabaseModule, TendersModule],
    controllers: [EmdsController],
    providers: [EmdsService],
    exports: [EmdsService],
})
export class EmdsModule { }
