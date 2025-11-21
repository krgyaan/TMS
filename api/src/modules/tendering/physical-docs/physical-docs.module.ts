import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { PhysicalDocsController } from './physical-docs.controller';
import { PhysicalDocsService } from './physical-docs.service';

@Module({
    imports: [DatabaseModule],
    controllers: [PhysicalDocsController],
    providers: [PhysicalDocsService],
    exports: [PhysicalDocsService],
})
export class PhysicalDocsModule { }
