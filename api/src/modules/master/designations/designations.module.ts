import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { DesignationsController } from './designations.controller';
import { DesignationsService } from './designations.service';

@Module({
    imports: [DatabaseModule],
    controllers: [DesignationsController],
    providers: [DesignationsService],
    exports: [DesignationsService],
})
export class DesignationsModule { }
