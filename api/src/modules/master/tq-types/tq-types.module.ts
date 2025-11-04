import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { TqTypesController } from './tq-types.controller';
import { TqTypesService } from './tq-types.service';

@Module({
    imports: [DatabaseModule],
    controllers: [TqTypesController],
    providers: [TqTypesService],
    exports: [TqTypesService],
})
export class TqTypesModule { }
