import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { DesignationsController } from '@/modules/master/designations/designations.controller';
import { DesignationsService } from '@/modules/master/designations/designations.service';

@Module({
    imports: [DatabaseModule],
    controllers: [DesignationsController],
    providers: [DesignationsService],
    exports: [DesignationsService],
})
export class DesignationsModule { }
