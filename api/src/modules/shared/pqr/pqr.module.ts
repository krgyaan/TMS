import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { PqrController } from './pqr.controller';
import { PqrService } from './pqr.service';

@Module({
    imports: [DatabaseModule],
    controllers: [PqrController],
    providers: [PqrService],
    exports: [PqrService],
})
export class PqrModule { }
