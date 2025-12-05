import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { TqTypesController } from '@/modules/master/tq-types/tq-types.controller';
import { TqTypesService } from '@/modules/master/tq-types/tq-types.service';

@Module({
    imports: [DatabaseModule],
    controllers: [TqTypesController],
    providers: [TqTypesService],
    exports: [TqTypesService],
})
export class TqTypesModule { }
