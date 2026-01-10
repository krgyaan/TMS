import { Module } from '@nestjs/common';
import { ChequeController } from './cheque.controller';
import { ChequeService } from './cheque.service';

@Module({
    controllers: [ChequeController],
    providers: [ChequeService],
    exports: [ChequeService],
})
export class ChequeModule {}
