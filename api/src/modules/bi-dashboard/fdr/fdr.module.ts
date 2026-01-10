import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { FdrController } from './fdr.controller';
import { FdrService } from './fdr.service';

@Module({
    imports: [DatabaseModule],
    controllers: [FdrController],
    providers: [FdrService],
    exports: [FdrService],
})
export class FdrModule {}
