import { Module } from '@nestjs/common';
import { FdrController } from './fdr.controller';
import { FdrService } from './fdr.service';

@Module({
    controllers: [FdrController],
    providers: [FdrService],
    exports: [FdrService],
})
export class FdrModule {}
