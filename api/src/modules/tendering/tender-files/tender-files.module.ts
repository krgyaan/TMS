import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TenderFilesController } from './tender-files.controller';
import { TenderFilesService } from './tender-files.service';

@Module({
    imports: [
        MulterModule.register({
            storage: memoryStorage(),
        }),
    ],
    controllers: [TenderFilesController],
    providers: [TenderFilesService],
    exports: [TenderFilesService],
})
export class TenderFilesModule { }
