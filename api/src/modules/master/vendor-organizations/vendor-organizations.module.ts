import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { VendorOrganizationsController } from '@/modules/master/vendor-organizations/vendor-organizations.controller';
import { VendorOrganizationsService } from '@/modules/master/vendor-organizations/vendor-organizations.service';

@Module({
    imports: [DatabaseModule],
    controllers: [VendorOrganizationsController],
    providers: [VendorOrganizationsService],
    exports: [VendorOrganizationsService],
})
export class VendorOrganizationsModule { }
