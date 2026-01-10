import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { ChequeController } from './cheque.controller';
import { ChequeService } from './cheque.service';

@Module({
    imports: [DatabaseModule],
    controllers: [ChequeController],
    providers: [ChequeService],
    exports: [ChequeService],
})
export class ChequeModule {}
