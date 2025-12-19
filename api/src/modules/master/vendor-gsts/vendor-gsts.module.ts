import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { VendorGstsController } from '@/modules/master/vendor-gsts/vendor-gsts.controller';
import { VendorGstsService } from '@/modules/master/vendor-gsts/vendor-gsts.service';

@Module({
    imports: [DatabaseModule],
    controllers: [VendorGstsController],
    providers: [VendorGstsService],
    exports: [VendorGstsService],
})
export class VendorGstsModule { }
