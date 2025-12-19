import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { VendorFilesController } from '@/modules/master/vendor-files/vendor-files.controller';
import { VendorFilesService } from '@/modules/master/vendor-files/vendor-files.service';

@Module({
    imports: [DatabaseModule],
    controllers: [VendorFilesController],
    providers: [VendorFilesService],
    exports: [VendorFilesService],
})
export class VendorFilesModule { }
